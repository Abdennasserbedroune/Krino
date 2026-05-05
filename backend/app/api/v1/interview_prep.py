"""Interview preparation endpoints.

Routes:
  POST /interview-prep/generate      — generate 10 practice questions
  POST /interview-prep/evaluate      — evaluate a single written answer
  POST /interview-prep/live/start    — start a live voice interview session
  POST /interview-prep/live/answer   — submit spoken answer, get next question + TTS audio
"""
from __future__ import annotations

import base64
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from app.services.ai.interview_service import (
    generate_interview_questions,
    evaluate_interview_answer,
    generate_live_opening,
    generate_live_followup,
)
from app.services.ai.tts_service import synthesise_speech, tts_available

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    job_title:        str
    job_field:        str
    experience_level: str  = "Mid"
    company_name:     str  = ""
    tech_stack:       str  = ""
    extra_context:    str  = ""
    language:         str  = "en"


class EvaluateRequest(BaseModel):
    question:      str
    answer:        str
    job_title:     str = "Software Engineer"
    question_type: str = "Technical"
    language:      str = "en"


class LiveStartRequest(BaseModel):
    job_title:        str
    job_field:        str
    experience_level: str = "Mid"
    company_name:     str = ""
    tech_stack:       str = ""
    language:         str = "en"
    total_turns:      int = 5


class HistoryItem(BaseModel):
    role:    str   # "ai" | "user"
    content: str


class LiveAnswerRequest(BaseModel):
    job_title:     str
    last_question: str
    answer:        str
    question_type: str = "Technical"
    history:       List[HistoryItem] = []
    turn_number:   int = 1
    total_turns:   int = 5
    language:      str = "en"
    tts_enabled:   bool = True


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _audio_to_b64(audio_bytes: Optional[bytes]) -> Optional[str]:
    """Base64-encode audio bytes for JSON transport, or return None."""
    if not audio_bytes:
        return None
    return base64.b64encode(audio_bytes).decode("utf-8")


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_questions(
    payload: GenerateRequest,
) -> Dict[str, Any]:
    """Generate 10 tailored interview questions for a role."""
    try:
        questions = generate_interview_questions(
            job_title        = payload.job_title,
            job_field        = payload.job_field,
            experience_level = payload.experience_level,
            company_name     = payload.company_name,
            tech_stack       = payload.tech_stack,
            extra_context    = payload.extra_context,
            language         = payload.language,
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@router.post("/evaluate")
async def evaluate_answer(
    payload: EvaluateRequest,
) -> Dict[str, Any]:
    """Evaluate a candidate's answer to an interview question."""
    if len(payload.answer.strip()) < 10:
        raise HTTPException(status_code=400, detail="Answer is too short to evaluate.")
    try:
        evaluation = evaluate_interview_answer(
            question      = payload.question,
            answer        = payload.answer,
            job_title     = payload.job_title,
            question_type = payload.question_type,
            language      = payload.language,
        )
        return {"evaluation": evaluation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.post("/live/start")
async def live_start(
    payload: LiveStartRequest,
) -> Dict[str, Any]:
    """Start a live interview session. Returns greeting + first question + optional TTS audio."""
    try:
        opening = generate_live_opening(
            job_title        = payload.job_title,
            job_field        = payload.job_field,
            experience_level = payload.experience_level,
            company_name     = payload.company_name,
            tech_stack       = payload.tech_stack,
            language         = payload.language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")

    # Build the full text the AI will speak
    speak_text = f"{opening.get('greeting', '')} {opening.get('first_question', '')}".strip()

    # Attempt TTS
    audio_b64: Optional[str] = None
    use_browser_tts = True
    if tts_available():
        audio_bytes = synthesise_speech(speak_text)
        if audio_bytes:
            audio_b64       = _audio_to_b64(audio_bytes)
            use_browser_tts = False

    return {
        "greeting":         opening.get("greeting", ""),
        "first_question":   opening.get("first_question", ""),
        "question_type":    opening.get("question_type", "Technical"),
        "hint":             opening.get("hint", ""),
        "speak_text":       speak_text,
        "audio_b64":        audio_b64,        # None → use browser TTS
        "use_browser_tts":  use_browser_tts,
        "total_turns":      payload.total_turns,
        "turn_number":      1,
    }


@router.post("/live/answer")
async def live_answer(
    payload: LiveAnswerRequest,
) -> Dict[str, Any]:
    """Process a spoken/typed answer: evaluate it + generate next question + optional TTS."""
    if len(payload.answer.strip()) < 5:
        raise HTTPException(status_code=400, detail="Answer too short.")

    # Step 1 — evaluate the answer
    try:
        evaluation = evaluate_interview_answer(
            question      = payload.last_question,
            answer        = payload.answer,
            job_title     = payload.job_title,
            question_type = payload.question_type,
            language      = payload.language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    # Step 2 — generate follow-up
    history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]
    try:
        followup = generate_live_followup(
            job_title    = payload.job_title,
            history      = history_dicts,
            last_answer  = payload.answer,
            evaluation   = evaluation,
            language     = payload.language,
            turn_number  = payload.turn_number,
            total_turns  = payload.total_turns,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Follow-up generation failed: {str(e)}")

    # Step 3 — TTS for AI response
    speak_text = (
        f"{followup.get('response', '')} {followup.get('next_question', '')}".strip()
    )
    audio_b64: Optional[str] = None
    use_browser_tts = True
    if payload.tts_enabled and tts_available():
        audio_bytes = synthesise_speech(speak_text)
        if audio_bytes:
            audio_b64       = _audio_to_b64(audio_bytes)
            use_browser_tts = False

    return {
        "evaluation":      evaluation,
        "response":        followup.get("response", ""),
        "next_question":   followup.get("next_question", ""),
        "question_type":   followup.get("question_type", "Technical"),
        "hint":            followup.get("hint", ""),
        "is_last":         followup.get("is_last", False),
        "speak_text":      speak_text,
        "audio_b64":       audio_b64,
        "use_browser_tts": use_browser_tts,
        "turn_number":     payload.turn_number + 1,
    }
