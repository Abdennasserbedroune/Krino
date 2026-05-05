"""Text-to-Speech service for Live Interview Mode.

Fallback chain:
  1. NVIDIA magpie-tts-zeroshot  (when NVIDIA_API_KEY is set)
  2. HuggingFace parler-tts-mini (when HF_API_TOKEN is set)
  3. Returns use_browser_tts=True flag — frontend uses SpeechSynthesis

All functions return a TTSResult dataclass.
"""
from __future__ import annotations

import base64
import io
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

from app.core.config import settings


# ─── Result type ───────────────────────────────────────────────────────────────────
@dataclass
class TTSResult:
    audio_b64: str = ""           # base64-encoded wav/mp3 — empty if browser fallback
    audio_format: str = "wav"     # mime type hint for frontend
    use_browser_tts: bool = False  # True → frontend falls back to SpeechSynthesis
    provider: str = "none"        # which provider succeeded
    error: str = ""               # last error message for debugging


# ─── Voice descriptions (Parler-TTS uses text descriptions, not reference audio) ──
_VOICE_EN = (
    "A clear, professional male voice speaking at a measured, calm pace. "
    "The tone is confident and authoritative, like a senior technical interviewer. "
    "Studio-quality recording with no background noise."
)
_VOICE_FR = (
    "Une voix masculine claire et professionnelle, parlant à un rythme calme et mesuré. "
    "Le ton est confiant et autoritaire, comme un intervieweur technique senior. "
    "Enregistrement de qualité studio sans bruit de fond."
)

# Parler-TTS model on HuggingFace
_HF_MODEL      = "parler-tts/parler-tts-mini-v1"
_HF_API_URL    = f"https://api-inference.huggingface.co/models/{_HF_MODEL}"
_HF_TIMEOUT    = 30.0  # seconds — model may need cold-start
_HF_MAX_RETRY  = 2
_HF_RETRY_WAIT = 20    # seconds to wait if model is loading

# NVIDIA magpie-tts endpoint
_NVIDIA_TTS_URL = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/877c3f32-90e7-4945-ab58-e789d33aa0bd"
_NVIDIA_TIMEOUT = 25.0


# ─── Internal helpers ───────────────────────────────────────────────────────────────

def _nvidia_tts(text: str, language: str) -> TTSResult:
    """Call NVIDIA magpie-tts-zeroshot.

    Requires NVIDIA_API_KEY in env.
    Needs a short reference audio clip for voice cloning —
    we use a bundled 6-second clip stored as b64 in this file.
    """
    api_key = getattr(settings, "NVIDIA_API_KEY", "") or os.environ.get("NVIDIA_API_KEY", "")
    if not api_key:
        return TTSResult(error="NVIDIA_API_KEY not set", use_browser_tts=False)

    # Bundled reference voice clip (6s professional male voice — replace with real clip)
    # For now we skip NVIDIA if no reference clip is available
    ref_clip_path = os.path.join(os.path.dirname(__file__), "voices", "interviewer_ref.wav")
    if not os.path.exists(ref_clip_path):
        return TTSResult(error="Reference voice clip not found", use_browser_tts=False)

    with open(ref_clip_path, "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode()

    try:
        with httpx.Client(timeout=_NVIDIA_TIMEOUT) as client:
            resp = client.post(
                _NVIDIA_TTS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text[:400],  # magpie max ~20s ≈ 400 chars
                    "voice_reference_audio": ref_b64,
                    "language": "fr-FR" if language == "fr" else "en-US",
                },
            )
        if resp.status_code == 200:
            audio_b64 = base64.b64encode(resp.content).decode()
            return TTSResult(audio_b64=audio_b64, audio_format="wav", provider="nvidia")
        return TTSResult(error=f"NVIDIA TTS HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        return TTSResult(error=f"NVIDIA TTS exception: {e}")


def _hf_parler_tts(text: str, language: str) -> TTSResult:
    """Call HuggingFace parler-tts-mini-v1 Inference API.

    Parler-TTS takes a text description of the voice — no reference clip needed.
    Returns wav bytes.
    """
    hf_token = getattr(settings, "HF_API_TOKEN", "") or os.environ.get("HF_API_TOKEN", "")
    if not hf_token:
        return TTSResult(error="HF_API_TOKEN not set")

    voice_desc = _VOICE_FR if language == "fr" else _VOICE_EN
    payload = {
        "inputs": text[:500],
        "parameters": {
            "description": voice_desc,
        },
    }
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }

    for attempt in range(_HF_MAX_RETRY):
        try:
            with httpx.Client(timeout=_HF_TIMEOUT) as client:
                resp = client.post(_HF_API_URL, headers=headers, json=payload)

            if resp.status_code == 200:
                audio_b64 = base64.b64encode(resp.content).decode()
                return TTSResult(audio_b64=audio_b64, audio_format="wav", provider="parler-tts")

            if resp.status_code == 503:
                # Model is loading — wait and retry
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                wait = body.get("estimated_time", _HF_RETRY_WAIT)
                print(f"[tts_service] HF model loading, waiting {wait}s (attempt {attempt+1})")
                time.sleep(min(float(wait), 30))
                continue

            return TTSResult(error=f"HF TTS HTTP {resp.status_code}: {resp.text[:200]}")

        except Exception as e:
            return TTSResult(error=f"HF TTS exception: {e}")

    return TTSResult(error="HF TTS: model did not load in time")


# ─── Public API ────────────────────────────────────────────────────────────────────────

def synthesize_speech(text: str, language: str = "en") -> TTSResult:
    """Main TTS entry point — tries providers in priority order.

    Priority:
      1. NVIDIA magpie-tts  (best quality, needs key + reference clip)
      2. HF parler-tts-mini (good quality, needs HF token only)
      3. Browser fallback   (always works, zero cost)
    """
    # Sanitise input
    text = (text or "").strip()
    if not text:
        return TTSResult(use_browser_tts=True, provider="none", error="Empty text")

    # 1. Try NVIDIA
    nvidia_key = getattr(settings, "NVIDIA_API_KEY", "") or os.environ.get("NVIDIA_API_KEY", "")
    if nvidia_key:
        result = _nvidia_tts(text, language)
        if result.audio_b64:
            return result
        print(f"[tts_service] NVIDIA failed: {result.error} — falling back to HF")

    # 2. Try HuggingFace parler-tts
    hf_token = getattr(settings, "HF_API_TOKEN", "") or os.environ.get("HF_API_TOKEN", "")
    if hf_token:
        result = _hf_parler_tts(text, language)
        if result.audio_b64:
            return result
        print(f"[tts_service] HF Parler-TTS failed: {result.error} — falling back to browser")

    # 3. Browser fallback
    return TTSResult(
        use_browser_tts=True,
        provider="browser",
        error="All TTS providers unavailable — using browser SpeechSynthesis",
    )
