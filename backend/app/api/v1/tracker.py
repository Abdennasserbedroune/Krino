"""Application Tracker endpoints — job seeker side."""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.tracker import SavedJob, JobApplication, ApplicationStage
from app.db.models.user import User
from app.db.session import get_db
from app.services.jd.jd_service import fetch_jd_from_url, parse_jd_text, score_jd_quality

router = APIRouter(prefix="/tracker", tags=["tracker"])


# ─── Schemas ─────────────────────────────────────────────────────────────────────────────
class JDIngestRequest(BaseModel):
    url: Optional[str] = None
    raw_text: Optional[str] = None   # paste mode


class SavedJobOut(BaseModel):
    id: int
    title: str
    company: Optional[str]
    location: Optional[str]
    work_mode: Optional[str]
    seniority: Optional[str]
    salary: Optional[str]
    url: Optional[str]
    jd_parsed: Optional[Dict[str, Any]]
    jd_score: Optional[Dict[str, Any]]
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    job_id: int
    cv_id: Optional[int] = None
    stage: str = ApplicationStage.SAVED
    notes: Optional[str] = None
    match_score: Optional[int] = None


class ApplicationUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    follow_up_at: Optional[datetime] = None
    match_score: Optional[int] = None
    cv_id: Optional[int] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    cv_id: Optional[int]
    stage: str
    applied_at: Optional[datetime]
    follow_up_at: Optional[datetime]
    notes: Optional[str]
    match_score: Optional[int]
    events: Optional[List[Dict[str, Any]]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── JD Ingestion ───────────────────────────────────────────────────────────────────────
class IngestResponse(BaseModel):
    job_id: int
    parsed: Dict[str, Any]
    jd_score: Dict[str, Any]


@router.post("/jd/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_jd(
    payload: JDIngestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Ingest a JD from URL or pasted text — parse and quality-score it."""
    if not payload.url and not payload.raw_text:
        raise HTTPException(status_code=400, detail="Provide url or raw_text.")

    raw = payload.raw_text
    source = "paste"
    if payload.url:
        try:
            raw = fetch_jd_from_url(payload.url)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        source = "url"

    if not raw or len(raw.strip()) < 80:
        raise HTTPException(status_code=422, detail="Not enough text to parse a job description.")

    parsed = parse_jd_text(raw)
    score  = score_jd_quality(raw, parsed)

    job = SavedJob(
        user_id   = current_user.id,
        title     = parsed.get("title") or "Unknown Role",
        company   = parsed.get("company"),
        location  = parsed.get("location"),
        work_mode = parsed.get("work_mode"),
        seniority = parsed.get("seniority"),
        salary    = parsed.get("salary"),
        url       = payload.url,
        jd_raw    = raw,
        jd_parsed = parsed,
        jd_score  = score,
        source    = source,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"job_id": job.id, "parsed": parsed, "jd_score": score}


# ─── Saved Jobs ────────────────────────────────────────────────────────────────────────
class SavedJobsResponse(BaseModel):
    jobs: List[SavedJobOut]


@router.get("/jobs", response_model=List[SavedJobOut])
async def list_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[SavedJob]:
    return db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_saved_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Response:
    job = db.query(SavedJob).filter(
        SavedJob.id == job_id, SavedJob.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Applications (Kanban) ─────────────────────────────────────────────────────────────
@router.get("/applications", response_model=List[ApplicationOut])
async def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> List[JobApplication]:
    return db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    ).order_by(JobApplication.updated_at.desc()).all()


@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> JobApplication:
    job = db.query(SavedJob).filter(
        SavedJob.id == payload.job_id, SavedJob.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Saved job not found.")

    app = JobApplication(
        user_id     = current_user.id,
        job_id      = payload.job_id,
        cv_id       = payload.cv_id,
        stage       = payload.stage,
        notes       = payload.notes,
        match_score = payload.match_score,
        events      = [{"type": "created", "date": datetime.utcnow().isoformat(), "note": "Application added"}],
    )
    if payload.stage == ApplicationStage.APPLIED:
        app.applied_at = datetime.utcnow()

    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
async def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> JobApplication:
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id, JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if payload.stage and payload.stage != app.stage:
        app.stage = payload.stage
        events = list(app.events or [])
        events.append({"type": "stage_change", "date": datetime.utcnow().isoformat(), "note": "Moved to " + payload.stage})
        app.events = events
        if payload.stage == ApplicationStage.APPLIED and not app.applied_at:
            app.applied_at = datetime.utcnow()

    if payload.notes is not None:
        app.notes = payload.notes
    if payload.follow_up_at is not None:
        app.follow_up_at = payload.follow_up_at
    if payload.match_score is not None:
        app.match_score = payload.match_score
    if payload.cv_id is not None:
        app.cv_id = payload.cv_id

    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.delete(
    "/applications/{app_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Response:
    app = db.query(JobApplication).filter(
        JobApplication.id == app_id, JobApplication.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(app)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
