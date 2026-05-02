"""Interview prep endpoints."""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.interview import InterviewSession
from app.db.models.tracker import SavedJob
from app.db.models.cv import CV
from app.db.models.user import User
from app.db.session import get_db
from app.services.interview.interview_service import generate_prep_pack, evaluate_answer

router = APIRouter(prefix="/interview", tags=["interview"])


# ─── Schemas ──────────────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    cv_id: Optional[int] = None
    job_id: Optional[int] = None
    title: Optional[str] = None


class AnswerSubmit(BaseModel):
    question_id: int
    answer: str
    expected_skills: List[str] = []


class SessionOut(BaseModel):
    id: int
    title: Optional[str]
    status: str
    overall_score: Optional[int]
    questions: Optional[List[Dict[str, Any]]]
    weak_points: Optional[List[str]]
    star_stories: Optional[List[Dict[str, Any]]]
    feedback_summary: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> InterviewSession:
    """Create a prep session. Generates question pack from CV + JD."""
    cv_structured: Dict[str, Any] = {}
    jd_parsed:     Dict[str, Any] = {}
    job_title = payload.title or ""
    language  = "en"

    if payload.cv_id:
        cv = db.query(CV).filter(CV.id == payload.cv_id, CV.user_id == current_user.id).first()
        if not cv:
            raise HTTPException(status_code=404, detail="CV not found.")
        cv_structured = cv.structured_data or {}
        # Infer language from CV
        extracted = cv.extracted_cv or {}
        language = extracted.get("cv_language", "en") if isinstance(extracted, dict) else "en"

    if payload.job_id:
        job = db.query(SavedJob).filter(
            SavedJob.id == payload.job_id, SavedJob.user_id == current_user.id
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Saved job not found.")
        jd_parsed = job.jd_parsed or {}
        if not job_title:
            job_title = job.title or ""

    prep = generate_prep_pack(
        cv_structured = cv_structured,
        jd_parsed     = jd_parsed,
        job_title     = job_title,
        language      = language,
    )

    session = InterviewSession(
        user_id      = current_user.id,
        cv_id        = payload.cv_id,
        job_id       = payload.job_id,
        title        = job_title or f"Prep Session {datetime.utcnow().strftime('%b %d')}",
        questions    = prep.get("questions") or [],
        weak_points  = prep.get("weak_points") or [],
        star_stories = prep.get("star_stories") or [],
        status       = "active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[SessionOut])
async def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[InterviewSession]:
    return db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).all()


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> InterviewSession:
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@router.post("/sessions/{session_id}/answer")
async def submit_answer(
    session_id: int,
    payload: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Submit an answer for a specific question and get AI feedback."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    questions = list(session.questions or [])
    q = next((q for q in questions if q.get("id") == payload.question_id), None)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found in session.")

    feedback = evaluate_answer(
        question       = q["question"],
        answer         = payload.answer,
        expected_skills= payload.expected_skills,
    )

    # Persist answer + feedback back into question object
    q["answer"]   = payload.answer
    q["score"]    = feedback.get("score")
    q["feedback"] = feedback.get("feedback")
    session.questions = questions

    # Update overall score = avg of answered questions
    answered = [q for q in questions if q.get("score") is not None]
    if answered:
        session.overall_score = int(sum(q["score"] for q in answered) / len(answered))

    db.add(session)
    db.commit()
    return feedback


@router.patch("/sessions/{session_id}/complete")
async def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    session.status = "completed"
    db.add(session)
    db.commit()
    return {"status": "completed", "overall_score": session.overall_score}
