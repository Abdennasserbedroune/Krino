"""TTS service — converts text to speech audio bytes.

Primary:  HuggingFace Inference API (parler-tts/parler-tts-mini-v1)
Fallback: Returns None — frontend falls back to browser SpeechSynthesis

The caller checks the return value:
  - bytes  → stream as audio/wav to the client
  - None   → tell frontend to use browser TTS
"""
from __future__ import annotations

import os
import io
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────
_HF_API_URL = (
    "https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-v1"
)
_HF_TOKEN = getattr(settings, "HF_API_TOKEN", "") or os.getenv("HF_API_TOKEN", "")

# Parler-TTS description — controls voice character
# Neutral, clear, professional interviewer voice
_VOICE_DESC = (
    "A professional, calm female voice with clear articulation, "
    "recorded in a quiet studio. No background noise. "
    "Natural pacing, warm but formal tone."
)

# Max chars we send to TTS (avoid very long requests)
_MAX_CHARS = 500

# Request timeout seconds
_TIMEOUT = 30.0


# ─── Public API ────────────────────────────────────────────────────────────

def synthesise_speech(text: str) -> Optional[bytes]:
    """Convert text to speech audio bytes (WAV).

    Returns audio bytes on success, None if TTS is unavailable
    (frontend should fall back to browser SpeechSynthesis).
    """
    if not _HF_TOKEN:
        logger.warning("[tts_service] HF_API_TOKEN not set — using browser TTS fallback")
        return None

    text = text.strip()[:_MAX_CHARS]
    if not text:
        return None

    try:
        response = httpx.post(
            _HF_API_URL,
            headers={
                "Authorization": f"Bearer {_HF_TOKEN}",
                "Content-Type":  "application/json",
            },
            json={
                "inputs": text,
                "parameters": {
                    "description": _VOICE_DESC,
                },
            },
            timeout=_TIMEOUT,
        )

        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "audio" in content_type or len(response.content) > 1000:
                return response.content
            # HF may return a JSON loading message (model warming up)
            logger.warning(
                "[tts_service] HF returned non-audio content — model may be loading: %s",
                response.text[:200],
            )
            return None

        if response.status_code == 503:
            # Model is loading — estimated_time in body
            logger.warning("[tts_service] HF model loading (503) — falling back to browser TTS")
            return None

        logger.error(
            "[tts_service] HF API error %s: %s",
            response.status_code, response.text[:300],
        )
        return None

    except httpx.TimeoutException:
        logger.warning("[tts_service] HF TTS request timed out — browser fallback")
        return None
    except Exception as e:
        logger.error("[tts_service] Unexpected error: %s", e)
        return None


def tts_available() -> bool:
    """Quick check: is the HF token configured?"""
    return bool(_HF_TOKEN)
