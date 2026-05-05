"""Interview preparation endpoints.

Routes:
  POST /api/v1/interview-prep/generate      — generate 10 questions
  POST /api/v1/interview-prep/evaluate      — evaluate a single answer
  POST /api/v1/interview-prep/live/start    — start a live voice session
  POST /api/v1/interview-prep/live/answer   — submit a voice answer, get next question + TTS
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.ai.interview_service import (
    evaluate_interview_answer,
    generate_followup_question,
    generate_interview_questions,
)
from app.services.ai.tts_service import TTSResult, synthesize_speech

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


# ─── Schemas ─────────────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    job_title:        str
    job_field:        str
    experience_level: str        = "Mid"
    company_name:     str        = ""
    tech_stack:       str        = ""
    extra_context:    str        = ""
    language:         str        = "en"


class GenerateResponse(BaseModel):
    questions: list[dict[str, Any]]


class EvaluateRequest(BaseModel):
    question:      str
    answer:        str
    job_title:     str
    question_type: str = "Technical"
    language:      str = "en"


class EvaluateResponse(BaseModel):
    evaluation: dict[str, Any]


class LiveStartRequest(BaseModel):
    job_title:        str
    job_field:        str
    experience_level: str = "Mid"
    company_name:     str = ""
    tech_stack:       str = ""
    language:         str = "en"


class LiveStartResponse(BaseModel):
    question:        str
    question_type:   str
    hint:            str
    turn_number:     int
    audio_b64:       str        = ""
    audio_format:    str        = "wav"
    use_browser_tts: bool       = False


class ConversationTurn(BaseModel):
    role:    str   # "assistant" | "user"
    content: str


class LiveAnswerRequest(BaseModel):
    job_title:             str
    job_field:             str
    last_question:         str
    last_question_type:    str = "Technical"
    answer_text:           str
    conversation_history:  list[ConversationTurn] = Field(default_factory=list)
    turn_number:           int  = 1
    language:              str  = "en"


class LiveAnswerResponse(BaseModel):
    # Evaluation of the answer just submitted
    evaluation:      dict[str, Any]
    # Next question (None if session is complete)
    next_question:        Optional[str]  = None
    next_question_type:   Optional[str]  = None
    next_hint:            Optional[str]  = None
    next_turn_number:     Optional[int]  = None
    session_complete:     bool           = False
    # TTS for next question
    audio_b64:            str            = ""
    audio_format:         str            = "wav"
    use_browser_tts:      bool           = False


# ─── Config ──────────────────────────────────────────────────────────────────────────

MAX_LIVE_TURNS = 8   # max follow-up questions in a live session


# ─── Routes ──────────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_questions(payload: GenerateRequest) -> GenerateResponse:
    """Generate 10 tailored interview questions for a given role."""
    if not payload.job_title.strip() or not payload.job_field.strip():
        raise HTTPException(status_code=422, detail="job_title and job_field are required.")

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
        raise HTTPException(
            status_code=503,
            detail="Failed to generate questions. The AI service may be temporarily busy. Please try again.",
        )

    return GenerateResponse(questions=questions)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(payload: EvaluateRequest) -> EvaluateResponse:
    """Evaluate a single interview answer and return scored feedback."""
    if not payload.answer.strip():
        raise HTTPException(status_code=422, detail="answer cannot be empty.")

    evaluation = evaluate_interview_answer(
        question=payload.question,
        answer=payload.answer,
        job_title=payload.job_title,
        question_type=payload.question_type,
        language=payload.language,
    )

    return EvaluateResponse(evaluation=evaluation)


@router.post("/live/start", response_model=LiveStartResponse)
async def live_start(payload: LiveStartRequest) -> LiveStartResponse:
    """Start a live voice interview session.

    Generates the opening question and synthesises it to audio.
    The first question is always a warm-up (Medium difficulty, Behavioral or Technical)
    to ease the candidate in.
    """
    if not payload.job_title.strip() or not payload.job_field.strip():
        raise HTTPException(status_code=422, detail="job_title and job_field are required.")

    # Generate opening question — use the standard generator, take the first result
    questions = generate_interview_questions(
        job_title=payload.job_title,
        job_field=payload.job_field,
        experience_level=payload.experience_level,
        company_name=payload.company_name,
        tech_stack=payload.tech_stack,
        language=payload.language,
    )

    if not questions:
        raise HTTPException(
            status_code=503,
            detail="Failed to generate opening question. Please try again.",
        )

    opening = questions[0]
    question_text = opening.get("question", "")

    # TTS
    tts: TTSResult = synthesize_speech(question_text, payload.language)

    return LiveStartResponse(
        question=question_text,
        question_type=opening.get("type", "Technical"),
        hint=opening.get("hint", ""),
        turn_number=1,
        audio_b64=tts.audio_b64,
        audio_format=tts.audio_format,
        use_browser_tts=tts.use_browser_tts,
    )


@router.post("/live/answer", response_model=LiveAnswerResponse)
async def live_answer(payload: LiveAnswerRequest) -> LiveAnswerResponse:
    """Submit an answer in a live session.

    1. Evaluates the submitted answer
    2. If turns remain, generates a follow-up question + TTS
    3. If MAX_LIVE_TURNS reached, marks session complete
    """
    if not payload.answer_text.strip():
        raise HTTPException(status_code=422, detail="answer_text cannot be empty.")

    # 1. Evaluate the answer
    evaluation = evaluate_interview_answer(
        question=payload.last_question,
        answer=payload.answer_text,
        job_title=payload.job_title,
        question_type=payload.last_question_type,
        language=payload.language,
    )

    # 2. Session complete?
    next_turn = payload.turn_number + 1
    if payload.turn_number >= MAX_LIVE_TURNS:
        return LiveAnswerResponse(
            evaluation=evaluation,
            session_complete=True,
        )

    # 3. Generate follow-up
    history = [
        {"role": t.role, "content": t.content}
        for t in payload.conversation_history
    ]
    followup = generate_followup_question(
        job_title=payload.job_title,
        job_field=payload.job_field,
        conversation_history=history,
        last_answer=payload.answer_text,
        last_question=payload.last_question,
        language=payload.language,
    )

    next_q_text = followup.get("question", "Can you elaborate further?")

    # 4. TTS for follow-up
    tts: TTSResult = synthesize_speech(next_q_text, payload.language)

    return LiveAnswerResponse(
        evaluation=evaluation,
        next_question=next_q_text,
        next_question_type=followup.get("type", "Technical"),
        next_hint=followup.get("hint", ""),
        next_turn_number=next_turn,
        session_complete=False,
        audio_b64=tts.audio_b64,
        audio_format=tts.audio_format,
        use_browser_tts=tts.use_browser_tts,
    )
