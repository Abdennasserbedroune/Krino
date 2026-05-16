"""CV Builder endpoints — create, edit, version, ATS-score, AI-suggest."""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.cv_builder import CVDraft, CVDraftVersion
from app.db.models.user import User
from app.db.session import get_db
from app.services.cv_builder.ai_suggestions import suggest_field, score_draft_ats

router = APIRouter(prefix="/cv-builder", tags=["cv-builder"])


# ─── Schemas ──────────────────────────────────────────────────────────────────
class DraftCreate(BaseModel):
    title: str = "Untitled Resume"
    template: str = "classic"
    language: str = "en"


class DraftUpdate(BaseModel):
    title: Optional[str] = None
    template: Optional[str] = None
    language: Optional[str] = None
    basics: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    custom_sections: Optional[List[Dict[str, Any]]] = None
    layout: Optional[Dict[str, Any]] = None


class FieldSuggestRequest(BaseModel):
    section: str
    field: str
    current_value: str
    context: Dict[str, Any] = {}
    action: str = "improve"
    jd_text: str = ""


class DraftOut(BaseModel):
    id: int
    title: str
    template: str
    language: str
    basics: Optional[Dict[str, Any]]
    summary: Optional[str]
    experience: Optional[List]
    education: Optional[List]
    skills: Optional[List]
    projects: Optional[List]
    certifications: Optional[List]
    languages: Optional[List]
    custom_sections: Optional[List]
    layout: Optional[Dict[str, Any]]
    ats_score: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Draft CRUD ────────────────────────────────────────────────────────────────
@router.get("/drafts", response_model=List[DraftOut])
async def list_drafts(db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> List[CVDraft]:
    return db.query(CVDraft).filter(CVDraft.user_id == current_user.id, CVDraft.is_active == True).order_by(CVDraft.updated_at.desc()).all()


@router.post("/drafts", response_model=DraftOut, status_code=status.HTTP_201_CREATED)
async def create_draft(payload: DraftCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> CVDraft:
    draft = CVDraft(user_id=current_user.id, title=payload.title, template=payload.template, language=payload.language)
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/drafts/{draft_id}", response_model=DraftOut)
async def get_draft(draft_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> CVDraft:
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    return draft


@router.patch("/drafts/{draft_id}", response_model=DraftOut)
async def update_draft(
    draft_id: int,
    payload: DraftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVDraft:
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(draft, field, value)
    draft_data = {"basics": draft.basics, "summary": draft.summary, "experience": draft.experience, "education": draft.education, "skills": draft.skills, "projects": draft.projects, "certifications": draft.certifications, "languages": draft.languages}
    draft.ats_score = score_draft_ats(draft_data)
    draft.last_scored_at = datetime.utcnow()
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(draft_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)):
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    draft.is_active = False
    db.add(draft)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Versioning ────────────────────────────────────────────────────────────────
@router.post("/drafts/{draft_id}/save-version", status_code=status.HTTP_201_CREATED)
async def save_version(
    draft_id: int,
    change_note: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    version_count = db.query(CVDraftVersion).filter(CVDraftVersion.draft_id == draft_id).count()
    snapshot = {"basics": draft.basics, "summary": draft.summary, "experience": draft.experience, "education": draft.education, "skills": draft.skills, "projects": draft.projects, "certifications": draft.certifications, "languages": draft.languages, "layout": draft.layout}
    version = CVDraftVersion(draft_id=draft_id, version_num=version_count + 1, snapshot=snapshot, ats_score=draft.ats_score, change_note=change_note)
    db.add(version)
    db.commit()
    db.refresh(version)
    return {"version_num": version.version_num, "ats_score": version.ats_score}


@router.get("/drafts/{draft_id}/versions")
async def list_versions(draft_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> List[Dict[str, Any]]:
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    versions = db.query(CVDraftVersion).filter(CVDraftVersion.draft_id == draft_id).order_by(CVDraftVersion.version_num.desc()).all()
    return [{"id": v.id, "version_num": v.version_num, "ats_score": v.ats_score, "change_note": v.change_note, "created_at": v.created_at.isoformat()} for v in versions]


# ─── AI Field Suggestions ─────────────────────────────────────────────────────
@router.post("/suggest/{draft_id}")
async def suggest(
    draft_id: int,
    payload: FieldSuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    draft = db.query(CVDraft).filter(CVDraft.id == draft_id, CVDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    variants = suggest_field(section=payload.section, field=payload.field, current_value=payload.current_value, context=payload.context, action=payload.action, jd_text=payload.jd_text, language=draft.language)
    return {"variants": variants}
