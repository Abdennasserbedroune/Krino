"""Recruiter pipeline analytics + candidate comparison + outreach endpoints."""
from __future__ import annotations
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.recruiter import CandidateCard, JobPosting
from app.db.models.outreach import OutreachMessage
from app.db.models.user import User
from app.db.session import get_db
from app.services.recruiter.pipeline_analytics import (
    get_pipeline_kpis,
    get_funnel_by_job,
    get_score_distribution,
)
from app.services.recruiter.outreach_service import generate_outreach
from app.services.jd.jd_service import parse_jd_text, score_jd_quality

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ─── Schemas ──────────────────────────────────────────────────────────────────
class OutreachRequest(BaseModel):
    candidate_id: int
    job_id: int
    message_type: str = "intro"   # intro / interview / followup / rejection / offer
    language: str = "en"


class OutreachSave(BaseModel):
    candidate_id: Optional[int] = None
    job_id: Optional[int] = None
    message_type: str
    subject: str
    body: str
    personalization_signals: Optional[List[str]] = None


class JDScoreRequest(BaseModel):
    job_id: int


# ─── Analytics ────────────────────────────────────────────────────────────────
@router.get("/kpis")
async def kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Top-level KPI cards for the recruiter dashboard."""
    return get_pipeline_kpis(db, current_user.id)


@router.get("/funnel/{job_id}")
async def funnel(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[Dict[str, Any]]:
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id, JobPosting.recruiter_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return get_funnel_by_job(db, current_user.id, job_id)


@router.get("/score-distribution/{job_id}")
async def score_dist(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[Dict[str, Any]]:
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id, JobPosting.recruiter_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return get_score_distribution(db, current_user.id, job_id)


# ─── Candidate Comparison ─────────────────────────────────────────────────────
@router.post("/compare")
async def compare_candidates(
    candidate_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Side-by-side comparison of 2-4 candidate cards."""
    if not (2 <= len(candidate_ids) <= 4):
        raise HTTPException(status_code=400, detail="Select 2 to 4 candidates to compare.")

    cards = db.query(CandidateCard).join(
        JobPosting, CandidateCard.job_id == JobPosting.id
    ).filter(
        CandidateCard.id.in_(candidate_ids),
        JobPosting.recruiter_id == current_user.id,
    ).all()

    if not cards:
        raise HTTPException(status_code=404, detail="No candidates found.")

    comparison = []
    for card in cards:
        comparison.append({
            "id":               card.id,
            "name":             card.candidate_name,
            "email":            card.candidate_email,
            "filename":         card.original_filename,
            "match_score":      card.match_score,
            "skills_score":     card.skills_score,
            "experience_score": card.experience_score,
            "quality_score":    card.quality_score,
            "stage":            card.stage,
            "strengths":        card.strengths or [],
            "risks":            card.risks or [],
            "ai_verdict":       card.ai_verdict,
            "hr_toolkit":       card.hr_toolkit,
            "notes":            card.notes,
        })

    # Sort by match_score desc
    comparison.sort(key=lambda x: (x["match_score"] or 0), reverse=True)
    return {"candidates": comparison, "count": len(comparison)}


# ─── Outreach ─────────────────────────────────────────────────────────────────
@router.post("/outreach/generate")
async def generate_outreach_message(
    payload: OutreachRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Generate a personalised outreach message for a candidate."""
    card = db.query(CandidateCard).join(
        JobPosting, CandidateCard.job_id == JobPosting.id
    ).filter(
        CandidateCard.id == payload.candidate_id,
        JobPosting.recruiter_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    job = db.query(JobPosting).filter(
        JobPosting.id == payload.job_id,
        JobPosting.recruiter_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = generate_outreach(
        message_type        = payload.message_type,
        candidate_name      = card.candidate_name or "Candidate",
        candidate_strengths = card.strengths or [],
        job_title           = job.title,
        company_name        = "",
        recruiter_name      = current_user.full_name if hasattr(current_user, 'full_name') else "",
        language            = payload.language,
    )
    return result


@router.post("/outreach/save", status_code=status.HTTP_201_CREATED)
async def save_outreach_message(
    payload: OutreachSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Persist an approved outreach draft."""
    msg = OutreachMessage(
        recruiter_id            = current_user.id,
        candidate_id            = payload.candidate_id,
        job_id                  = payload.job_id,
        message_type            = payload.message_type,
        subject                 = payload.subject,
        body                    = payload.body,
        personalization_signals = payload.personalization_signals,
        status                  = "draft",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "status": msg.status}


@router.get("/outreach")
async def list_outreach(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[Dict[str, Any]]:
    msgs = db.query(OutreachMessage).filter(
        OutreachMessage.recruiter_id == current_user.id
    ).order_by(OutreachMessage.created_at.desc()).all()
    return [
        {
            "id": m.id, "message_type": m.message_type,
            "subject": m.subject, "body": m.body,
            "status": m.status, "candidate_id": m.candidate_id,
            "job_id": m.job_id, "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


# ─── JD Quality Scorer ────────────────────────────────────────────────────────
@router.post("/jd-score")
async def score_job_description(
    payload: JDScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Score an existing recruiter job posting's JD quality."""
    job = db.query(JobPosting).filter(
        JobPosting.id == payload.job_id,
        JobPosting.recruiter_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    jd_text = job.jd_text or ""
    if not jd_text:
        raise HTTPException(status_code=400, detail="This job has no JD text to score.")

    parsed = parse_jd_text(jd_text)
    score  = score_jd_quality(jd_text, parsed)
    return {"job_id": job.id, "jd_score": score}
