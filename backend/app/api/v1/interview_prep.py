"""Interview preparation endpoints — practice mode + live interview mode."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.core.security import get_current_supabase_user
from app.db.models.user import User
from app.services.ai.interview_service import (
    generate_interview_questions,
    evaluate_interview_answer,
    generate_followup_question,
)
from app.services.ai.tts_service import synthesize_speech
from app.services.ai.stt_service import transcribe_audio

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


# ── Schemas ───────────────────────────────────────────────────────────────────

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
    job_title:     str
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
    tts_enabled:      bool = True


# ── Practice mode: generate questions ────────────────────────────────────────

@router.post("/generate")
async def generate_questions(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Generate 10 targeted interview questions for a given role."""
    questions = generate_interview_questions(
        job_title=payload.job_title,
        job_field=payload.job_field,
        experience_level=payload.experience_level,
        company_name=payload.company_name,
        tech_stack=payload.tech_stack,
        extra_context=payload.extra_context,
        language=payload.language,
    )
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate questions. Please retry.")
    return {"questions": questions}


# ── Practice mode: evaluate answer ───────────────────────────────────────────

@router.post("/evaluate")
async def evaluate_answer(
    payload: EvaluateRequest,
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Evaluate a candidate's answer to one interview question."""
    evaluation = evaluate_interview_answer(
        question=payload.question,
        answer=payload.answer,
        job_title=payload.job_title,
        question_type=payload.question_type,
        language=payload.language,
    )
    return {"evaluation": evaluation}


# ── Live interview: start session ─────────────────────────────────────────────

@router.post("/live/start")
async def live_start(
    payload: LiveStartRequest,
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Start a live interview session.

    Generates the first question and optionally synthesizes it to speech.
    Returns: { question_text, audio_b64, mime_type, use_browser_tts, turn: 1, total_turns }
    """
    # Generate opening question
    questions = generate_interview_questions(
        job_title=payload.job_title,
        job_field=payload.job_field,
        experience_level=payload.experience_level,
        company_name=payload.company_name,
        tech_stack=payload.tech_stack,
        language=payload.language,
    )
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate opening question.")

    first_q = questions[0]["question"]

    # TTS (async, non-blocking)
    audio_b64      = None
    mime_type      = "audio/wav"
    use_browser_tts = True

    if payload.tts_enabled:
        tts_result = await synthesize_speech(first_q, payload.language)
        audio_b64       = tts_result.audio_b64
        mime_type       = tts_result.mime_type
        use_browser_tts = tts_result.use_browser_tts

    return {
        "question_text":   first_q,
        "audio_b64":       audio_b64,
        "mime_type":       mime_type,
        "use_browser_tts": use_browser_tts,
        "turn":            1,
        "total_turns":     payload.total_turns,
        "all_questions":   [q["question"] for q in questions],  # stored client-side for context
    }


# ── Live interview: submit answer ─────────────────────────────────────────────

@router.post("/live/answer")
async def live_answer(
    audio:              UploadFile = File(...),
    question_text:      str = Form(...),
    job_title:          str = Form(...),
    job_field:          str = Form(...),
    experience_level:   str = Form("Mid"),
    question_type:      str = Form("Technical"),
    turn_number:        int = Form(1),
    total_turns:        int = Form(5),
    language:           str = Form("en"),
    tts_enabled:        bool = Form(True),
    conversation_json:  str = Form("[]"),  # JSON string of prior turns
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Process one turn of a live interview.

    Steps (parallelised where possible):
      1. Read audio bytes
      2. STT via Nemotron Omni → transcript
      3. Evaluate transcript
      4. Generate follow-up question (if turns remain)
      5. TTS follow-up

    Returns full turn result + next question audio.
    """
    import json as _json

    # 1. Read audio
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file.")

    # 2. STT
    stt_result = await transcribe_audio(audio_bytes, language)
    transcript = stt_result.transcript

    if not stt_result.success or not transcript.strip():
        # STT failed — still evaluate with empty answer so session continues
        transcript = ""
        stt_error  = stt_result.error or "Transcription failed"
    else:
        stt_error = None

    # 3. Parse conversation history
    try:
        conversation_history: List[Dict[str, str]] = _json.loads(conversation_json)
    except Exception:
        conversation_history = []

    # 4. Evaluate + generate next question in parallel
    is_last_turn = (turn_number >= total_turns)

    eval_task     = asyncio.to_thread(
        evaluate_interview_answer,
        question=question_text,
        answer=transcript or "(no answer provided)",
        job_title=job_title,
        question_type=question_type,
        language=language,
    )

    if not is_last_turn:
        # Build history including current turn for context
        updated_history = conversation_history + [
            {"role": "assistant", "content": question_text},
            {"role": "user",      "content": transcript or "(no answer)"},
        ]
        followup_task = asyncio.to_thread(
            generate_followup_question,
            job_title=job_title,
            job_field=job_field,
            experience_level=experience_level,
            conversation_history=updated_history,
            last_evaluation={},  # filled after eval resolves
            turn_number=turn_number + 1,
            total_turns=total_turns,
            language=language,
        )
        evaluation, next_question_text = await asyncio.gather(eval_task, followup_task)
    else:
        evaluation     = await eval_task
        next_question_text = None

    # 5. TTS for next question
    audio_b64       = None
    mime_type       = "audio/wav"
    use_browser_tts = True

    if next_question_text and tts_enabled:
        tts_result      = await synthesize_speech(next_question_text, language)
        audio_b64       = tts_result.audio_b64
        mime_type       = tts_result.mime_type
        use_browser_tts = tts_result.use_browser_tts

    return {
        "transcript":        transcript,
        "stt_error":         stt_error,
        "evaluation":        evaluation,
        "next_question":     next_question_text,
        "audio_b64":         audio_b64,
        "mime_type":         mime_type,
        "use_browser_tts":   use_browser_tts,
        "turn":              turn_number,
        "is_last_turn":      is_last_turn,
    }
