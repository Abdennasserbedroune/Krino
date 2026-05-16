"""Interview preparation endpoints."""
from __future__ import annotations

import base64
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.ai.interview_service import (
    generate_interview_questions,
    evaluate_interview_answer,
    generate_live_opening,
    generate_live_followup,
)
from app.services.ai.tts_service import synthesise_speech, tts_available

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


class GenerateRequest(BaseModel):
    job_title:        str
    job_field:        str
    experience_level: str = "Mid"
    company_name:     str = ""
    tech_stack:       str = ""
    extra_context:    str = ""
    language:         str = "en"


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
    role:    str
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


def _audio_to_b64(audio_bytes: Optional[bytes]) -> Optional[str]:
    if not audio_bytes:
        return None
    return base64.b64encode(audio_bytes).decode("utf-8")


@router.post("/generate")
async def generate_questions(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    try:
        questions = generate_interview_questions(
            job_title=payload.job_title, job_field=payload.job_field,
            experience_level=payload.experience_level, company_name=payload.company_name,
            tech_stack=payload.tech_stack, extra_context=payload.extra_context, language=payload.language,
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {e}")


@router.post("/evaluate")
async def evaluate_answer(
    payload: EvaluateRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if len(payload.answer.strip()) < 10:
        raise HTTPException(status_code=400, detail="Answer is too short to evaluate.")
    try:
        evaluation = evaluate_interview_answer(
            question=payload.question, answer=payload.answer,
            job_title=payload.job_title, question_type=payload.question_type, language=payload.language,
        )
        return {"evaluation": evaluation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")


@router.post("/live/start")
async def live_start(
    payload: LiveStartRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    try:
        opening = generate_live_opening(
            job_title=payload.job_title, job_field=payload.job_field,
            experience_level=payload.experience_level, company_name=payload.company_name,
            tech_stack=payload.tech_stack, language=payload.language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {e}")

    speak_text = f"{opening.get('greeting', '')} {opening.get('first_question', '')}".strip()
    audio_b64: Optional[str] = None
    use_browser_tts = True
    if tts_available():
        audio_bytes = synthesise_speech(speak_text)
        if audio_bytes:
            audio_b64 = _audio_to_b64(audio_bytes)
            use_browser_tts = False

    return {
        "greeting": opening.get("greeting", ""), "first_question": opening.get("first_question", ""),
        "question_type": opening.get("question_type", "Technical"), "hint": opening.get("hint", ""),
        "speak_text": speak_text, "audio_b64": audio_b64, "use_browser_tts": use_browser_tts,
        "total_turns": payload.total_turns, "turn_number": 1,
    }


@router.post("/live/answer")
async def live_answer(
    payload: LiveAnswerRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if len(payload.answer.strip()) < 5:
        raise HTTPException(status_code=400, detail="Answer too short.")

    try:
        evaluation = evaluate_interview_answer(
            question=payload.last_question, answer=payload.answer,
            job_title=payload.job_title, question_type=payload.question_type, language=payload.language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]
    try:
        followup = generate_live_followup(
            job_title=payload.job_title, history=history_dicts, last_answer=payload.answer,
            evaluation=evaluation, language=payload.language,
            turn_number=payload.turn_number, total_turns=payload.total_turns,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Follow-up generation failed: {e}")

    speak_text = f"{followup.get('response', '')} {followup.get('next_question', '')}".strip()
    audio_b64: Optional[str] = None
    use_browser_tts = True
    if payload.tts_enabled and tts_available():
        audio_bytes = synthesise_speech(speak_text)
        if audio_bytes:
            audio_b64 = _audio_to_b64(audio_bytes)
            use_browser_tts = False

    return {
        "evaluation": evaluation, "response": followup.get("response", ""),
        "next_question": followup.get("next_question", ""), "question_type": followup.get("question_type", "Technical"),
        "hint": followup.get("hint", ""), "is_last": followup.get("is_last", False),
        "speak_text": speak_text, "audio_b64": audio_b64, "use_browser_tts": use_browser_tts,
        "turn_number": payload.turn_number + 1,
    }
