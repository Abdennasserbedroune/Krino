"""Text-to-speech pipeline with fallback chain.

Priority:
  1. NVIDIA Magpie-TTS (when API key is available)
  2. HuggingFace Parler-TTS-Mini (free inference API)
  3. Returns use_browser_tts=True flag so frontend uses SpeechSynthesis

All functions return a TTSResult dataclass.
"""
import base64
import httpx
from dataclasses import dataclass
from typing import Optional
from app.core.config import settings


@dataclass
class TTSResult:
    audio_b64: Optional[str]   # base64-encoded wav/mp3 bytes
    mime_type: str             # "audio/wav" or "audio/mpeg"
    use_browser_tts: bool      # True = no audio, tell frontend to use SpeechSynthesis
    error: Optional[str] = None


# ── Parler-TTS via HuggingFace Inference API ──────────────────────────────────

PARLER_MODEL = "parler-tts/parler-tts-mini-v1"
HF_INFERENCE_URL = f"https://api-inference.huggingface.co/models/{PARLER_MODEL}"

# Professional interviewer voice description for Parler-TTS
VOICE_DESC_EN = (
    "A clear, calm, professional male voice with a neutral accent. "
    "Speaks at a measured pace, neither too fast nor too slow. "
    "High quality recording, no background noise."
)
VOICE_DESC_FR = (
    "Une voix masculine claire, calme et professionnelle avec un accent neutre. "
    "Parle à un rythme mesuré, ni trop vite ni trop lentement. "
    "Enregistrement de haute qualité, sans bruit de fond."
)


async def _tts_parler(text: str, language: str = "en") -> TTSResult:
    """Call HuggingFace Parler-TTS inference API."""
    if not settings.HF_API_TOKEN:
        return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error="No HF token")

    description = VOICE_DESC_FR if language == "fr" else VOICE_DESC_EN

    payload = {
        "inputs": text,
        "parameters": {"description": description},
    }
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(HF_INFERENCE_URL, json=payload, headers=headers)

        if resp.status_code == 503:
            # Model loading — common on free tier, return browser fallback
            print("[tts_service] Parler-TTS model loading (503) — using browser TTS")
            return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error="model_loading")

        if resp.status_code != 200:
            print(f"[tts_service] Parler-TTS error {resp.status_code}: {resp.text[:200]}")
            return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error=f"HF {resp.status_code}")

        audio_bytes = resp.content
        audio_b64   = base64.b64encode(audio_bytes).decode("utf-8")
        return TTSResult(audio_b64=audio_b64, mime_type="audio/flac", use_browser_tts=False)

    except Exception as e:
        print(f"[tts_service] Parler-TTS exception: {e}")
        return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error=str(e))


# ── NVIDIA Magpie-TTS ─────────────────────────────────────────────────────────

async def _tts_nvidia(text: str, language: str = "en") -> TTSResult:
    """Call NVIDIA Magpie-TTS NIM endpoint."""
    if not settings.NVIDIA_API_KEY:
        return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error="No NVIDIA key")

    # Load the bundled reference voice clip
    import os
    voice_file = os.path.join(
        os.path.dirname(__file__),
        "voices",
        "interviewer-fr.wav" if language == "fr" else "interviewer-en.wav",
    )
    try:
        with open(voice_file, "rb") as f:
            voice_b64 = base64.b64encode(f.read()).decode("utf-8")
    except FileNotFoundError:
        print(f"[tts_service] Voice file not found: {voice_file} — falling back to Parler")
        return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error="voice_file_missing")

    url = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/0f4b3e80-e2c3-4f24-9fe3-3b8dde3dd4d4"
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "text":                    text,
        "voice_reference_audio":   voice_b64,
        "voice_reference_format":  "wav",
        "output_format":           "wav",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code != 200:
            print(f"[tts_service] NVIDIA Magpie error {resp.status_code}: {resp.text[:200]}")
            return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error=f"NVIDIA {resp.status_code}")

        audio_b64 = base64.b64encode(resp.content).decode("utf-8")
        return TTSResult(audio_b64=audio_b64, mime_type="audio/wav", use_browser_tts=False)

    except Exception as e:
        print(f"[tts_service] NVIDIA Magpie exception: {e}")
        return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True, error=str(e))


# ── Public entry point ────────────────────────────────────────────────────────

async def synthesize_speech(text: str, language: str = "en") -> TTSResult:
    """Try TTS providers in order, return first success.

    Chain: NVIDIA Magpie → HF Parler-TTS → browser fallback
    """
    # 1. NVIDIA (only if key present)
    if settings.NVIDIA_API_KEY:
        result = await _tts_nvidia(text, language)
        if not result.use_browser_tts:
            return result

    # 2. HuggingFace Parler-TTS
    if settings.HF_API_TOKEN:
        result = await _tts_parler(text, language)
        if not result.use_browser_tts:
            return result

    # 3. Browser fallback
    return TTSResult(audio_b64=None, mime_type="audio/wav", use_browser_tts=True)
