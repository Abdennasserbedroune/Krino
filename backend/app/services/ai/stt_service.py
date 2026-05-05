"""Speech-to-text via OpenRouter Nemotron Omni.

Sends audio as base64-encoded content in the message.
Falls back to returning an empty string with an error flag.
"""
import base64
import httpx
from dataclasses import dataclass
from typing import Optional
from app.core.config import settings


@dataclass
class STTResult:
    transcript: str
    error: Optional[str] = None
    success: bool = True


async def transcribe_audio(audio_bytes: bytes, language: str = "en") -> STTResult:
    """Transcribe audio bytes using Nemotron 3 Nano Omni via OpenRouter.

    audio_bytes: raw audio file bytes (webm/opus from MediaRecorder)
    language: 'en' or 'fr' — used in the prompt
    """
    if not settings.OPENROUTER_API_KEY:
        return STTResult(transcript="", error="No OpenRouter API key", success=False)

    if not audio_bytes:
        return STTResult(transcript="", error="Empty audio", success=False)

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    lang_instruction = (
        "Transcribe the following audio. The speaker is answering an interview question in French. "
        "Return ONLY the transcription text, nothing else."
        if language == "fr"
        else
        "Transcribe the following audio. The speaker is answering an interview question in English. "
        "Return ONLY the transcription text, nothing else."
    )

    payload = {
        "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text",  "text": lang_instruction},
                    {
                        "type":      "input_audio",
                        "input_audio": {
                            "data":   audio_b64,
                            "format": "webm",
                        },
                    },
                ],
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.0,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://krino.app",
        "X-Title":       "Krino Interview",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            )

        if resp.status_code != 200:
            print(f"[stt_service] Nemotron error {resp.status_code}: {resp.text[:300]}")
            return STTResult(transcript="", error=f"STT {resp.status_code}", success=False)

        data     = resp.json()
        text_out = data["choices"][0]["message"]["content"].strip()
        return STTResult(transcript=text_out, success=True)

    except Exception as e:
        print(f"[stt_service] transcribe_audio exception: {e}")
        return STTResult(transcript="", error=str(e), success=False)
