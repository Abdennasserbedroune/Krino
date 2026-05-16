"""CV upload, listing, analysis, action-plan and job-match endpoints."""
import json
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash, get_current_supabase_user
from app.db.models.cv import CV
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.cv import CVRead
from app.services.storage.file_storage import save_cv_file
from app.services.cv.parsing import parse_cv_file
from app.services.cv.analysis import analyze_cv_local
from app.services.cv.structure import extract_structured_data
from app.services.ai.groq_client import (
    review_cv_with_groq,
    rewrite_cv_with_groq,
    extract_job_requirements,
    analyze_cv_against_job,
)
from app.services.ai.language_utils import resolve_language
from app.services.cv.pdf_generator import generate_cv_pdf_bytes
from app.services.cv.action_plan import generate_action_plan

router = APIRouter(prefix="/cv", tags=["cv"])


# ─── Schemas ───────────────────────────────────────────────────────────────────
class JobMatchRequest(BaseModel):
    cv_id: int
    job_category: str = Field(default="")
    job_title: str = Field(default="")
    job_description: str = Field(default="", max_length=5000)
    experience_required: str = Field(default="")
    skills_required: str = Field(default="")
    language: Literal["en", "fr", "auto"] = Field(default="auto")


class JobMatchResponse(BaseModel):
    cv_id: int
    file_name: str
    match_score: int
    skills_match_score: int
    experience_score: int
    cv_quality_score: int
    overall_verdict: str
    hire_probability: str
    overall_reason: str
    strengths: List[str]
    gaps: List[str]
    actionable_advice: List[str]
    application_ready: bool
    job_requirements: Dict[str, Any]


class SuggestJobQueryRequest(BaseModel):
    cv_id: int


# ─── Scoring helpers ───────────────────────────────────────────────────────────
import re

_DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "ai & data": ["data", "analytics", "machine learning", "ml", "ai", "python", "sql"],
    "software engineering": ["software", "developer", "engineer", "javascript", "typescript", "react", "node", "java", "c#", "c++"],
    "product management": ["product manager", "roadmap", "backlog", "stakeholder", "kpi"],
    "marketing & growth": ["marketing", "campaign", "seo", "sem", "growth", "branding"],
    "finance & banking": ["finance", "financial", "bank", "investment", "valuation"],
    "design & ux": ["design", "designer", "ux", "ui", "figma", "wireframe", "prototype", "adobe"],
}

_ROLE_TO_CATEGORY: Dict[str, str] = {
    "data analyst": "data", "data scientist": "data", "data engineer": "data",
    "analytics": "data", "machine learning": "data",
    "software engineer": "software-dev", "software developer": "software-dev",
    "full stack": "software-dev", "frontend": "software-dev", "backend": "software-dev",
    "react": "software-dev", "node": "software-dev", "python developer": "software-dev",
    "devops": "devops-sysadmin", "sre": "devops-sysadmin", "site reliability": "devops-sysadmin",
    "cloud engineer": "devops-sysadmin", "kubernetes": "devops-sysadmin",
    "product manager": "product", "product owner": "product",
    "ux designer": "design", "ui designer": "design", "graphic designer": "design", "figma": "design",
    "marketing": "marketing", "seo": "marketing", "growth": "marketing",
    "financial analyst": "finance", "accountant": "finance", "finance": "finance",
    "hr manager": "hr", "recruiter": "hr", "talent acquisition": "hr",
    "content writer": "writing", "copywriter": "writing", "technical writer": "writing",
    "qa engineer": "qa", "test automation": "qa", "quality assurance": "qa",
    "customer success": "customer-support", "support": "customer-support",
    "project manager": "management-finance", "scrum master": "management-finance", "program manager": "management-finance",
    "lawyer": "legal", "legal": "legal", "compliance": "legal", "paralegal": "legal",
    "teacher": "education", "trainer": "education", "e-learning": "education",
    "sales": "business", "account executive": "business", "business development": "business",
}


def _experience_score(candidate_years: int, required_range: str) -> int:
    digits = re.findall(r"\d+", required_range or "")
    if not digits:
        return 60
    required = int(digits[0]) if len(digits) == 1 else int((int(digits[0]) + int(digits[1])) / 2)
    if required <= 0:
        return 60
    if candidate_years <= 0:
        return 30
    shortfall = required - candidate_years
    if shortfall >= 4: return 20
    if shortfall >= 2: return 35
    if shortfall > 0: return 50
    extra = candidate_years - required
    if extra <= 1: return 90
    if extra <= 3: return 80
    return 70


def _domain_score(domain: str, raw_text: str) -> int:
    base = (domain or "").strip().lower()
    keywords = next((kws for key, kws in _DOMAIN_KEYWORDS.items() if key in base), None)
    if not keywords:
        return 60
    hits = sum(1 for kw in keywords if kw in (raw_text or "").lower())
    return 20 if hits == 0 else max(30, min(95, int((hits / len(keywords)) * 100)))


def _skills_score(required_skills: List[str], cv_skills: Any) -> int:
    if not required_skills:
        return 60
    job_tokens = {s.lower().strip() for s in required_skills if s.strip()}
    cv_tokens: List[str] = []
    if isinstance(cv_skills, list):
        for item in cv_skills:
            if isinstance(item, str):
                cv_tokens.extend([t.strip() for t in item.lower().split(",")])
    elif isinstance(cv_skills, dict):
        for value in cv_skills.values():
            if isinstance(value, str):
                cv_tokens.extend([t.strip() for t in value.lower().split(",")])
            elif isinstance(value, list):
                for v in value:
                    if isinstance(v, str):
                        cv_tokens.extend([t.strip() for t in v.lower().split(",")])
    cv_set = {t for t in cv_tokens if t}
    if not job_tokens or not cv_set:
        return 50
    intersection = job_tokens & cv_set
    return 25 if not intersection else max(40, min(95, int((len(intersection) / len(job_tokens)) * 100)))


def _combine_scores(domain: int, experience: int, skills: int, quality: int) -> int:
    return max(0, min(100, int(0.35 * domain + 0.30 * experience + 0.25 * skills + 0.10 * quality)))


def _resolve_raw_text(cv: CV) -> str:
    extracted = cv.extracted_cv or {}
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except Exception:
            extracted = {}
    raw_text = str(extracted.get("raw_text", "")).strip() if isinstance(extracted, dict) else ""
    if not raw_text:
        try:
            from app.services.cv.text_extraction import extract_text_from_file
            raw_text = (extract_text_from_file(cv.file_path, cv.file_type) or "").strip()
        except Exception:
            raw_text = ""
    return raw_text


def _resolve_cv_language(cv: CV) -> str:
    extracted = cv.extracted_cv or {}
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except Exception:
            extracted = {}
    if isinstance(extracted, dict):
        lang = extracted.get("cv_language", "")
        if lang in ("fr", "en"):
            return lang
    from app.services.ai.language_utils import detect_text_language
    raw_text = _resolve_raw_text(cv)
    return detect_text_language(raw_text) if raw_text else "fr"


def _resolve_candidate_years(cv: CV, raw_text: str) -> int:
    extracted = cv.extracted_cv or {}
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except Exception:
            extracted = {}
    if isinstance(extracted, dict):
        years = extracted.get("total_years_experience")
        if isinstance(years, int):
            return years
    return 0


# ─── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/upload", response_model=CVRead, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = file.filename.split(".")[-1].lower()
    if ext not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {settings.ALLOWED_FILE_TYPES}")

    # Read bytes first so we can size-check before touching the filesystem
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    existing_cv = db.query(CV).filter(CV.user_id == current_user.id, CV.original_filename == file.filename).first()
    if existing_cv:
        raise HTTPException(status_code=409, detail=f"A file named '{file.filename}' already exists. Rename or delete it first.")

    # Rewind and save
    import io
    file.file = io.BytesIO(file_bytes)
    file_path, file_size, ext = await save_cv_file(current_user.id, file)

    try:
        extracted_data = parse_cv_file(file_path, ext)
    except Exception as exc:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(status_code=422, detail=f"Could not extract text from the uploaded file: {exc}") from exc

    if extracted_data.get("page_count", 0) > 5:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(status_code=400, detail="File has too many pages (max 5)")

    raw_text = (extracted_data.get("raw_text", "") or "").strip()
    if not raw_text:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(status_code=422, detail="No readable text found. Please upload a text-based PDF or DOCX.")

    try:
        analysis_result = analyze_cv_local(raw_text)
    except Exception:
        analysis_result = {"score": 0}

    try:
        structured_data = extract_structured_data(raw_text)
    except Exception:
        structured_data = {}

    from app.services.cv.cv_extractor import _compute_years_experience
    from app.services.ai.language_utils import detect_text_language

    if "total_years_experience" not in extracted_data:
        extracted_data["total_years_experience"] = _compute_years_experience(structured_data.get("experience") or [])
    if "cv_language" not in extracted_data:
        extracted_data["cv_language"] = detect_text_language(raw_text)

    cv = CV(
        user_id=current_user.id,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        extracted_cv=extracted_data,
        analysis_result=analysis_result,
        score=analysis_result.get("score", 0),
        structured_data=structured_data,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.post("/match-to-job", response_model=JobMatchResponse, status_code=status.HTTP_200_OK)
async def match_cv_to_job(
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> JobMatchResponse:
    try:
        return await _do_match_cv_to_job(payload, db, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Match analysis failed: {exc}") from exc


async def _do_match_cv_to_job(payload: JobMatchRequest, db: Session, current_user: User) -> JobMatchResponse:
    cv = db.query(CV).filter(CV.id == payload.cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")

    raw_text = _resolve_raw_text(cv)
    analysis: Dict[str, Any] = cv.analysis_result or {}
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except Exception:
            analysis = {}
    if not analysis or "score" not in analysis:
        try:
            analysis = analyze_cv_local(raw_text) if raw_text else {"score": 0}
        except Exception:
            analysis = {"score": 0}
        cv.analysis_result = analysis
        cv.score = int(analysis.get("score", 0) or 0)

    structured: Dict[str, Any] = cv.structured_data or {}
    if isinstance(structured, str):
        try:
            structured = json.loads(structured)
        except Exception:
            structured = {}
    if not structured:
        try:
            structured = extract_structured_data(raw_text) if raw_text else {}
        except Exception:
            structured = {}
        cv.structured_data = structured

    db.add(cv)
    db.commit()
    db.refresh(cv)

    candidate_years = _resolve_candidate_years(cv, raw_text)
    exp_score = _experience_score(candidate_years, payload.experience_required)
    dom_score = _domain_score(payload.job_category, raw_text)
    resolved_lang = _resolve_cv_language(cv)

    job_reqs = extract_job_requirements(
        job_description=payload.job_description,
        job_category=payload.job_category,
        job_title=payload.job_title,
        skills_hint=payload.skills_required,
        language=resolved_lang,
    )

    extracted_skills = job_reqs.get("required_skills") or []
    if extracted_skills:
        sk_score = _skills_score(extracted_skills, structured.get("skills") or [])
    else:
        fallback_skills = [s.strip() for s in (payload.skills_required or "").split(",") if s.strip()]
        sk_score = _skills_score(fallback_skills, structured.get("skills") or [])

    cv_quality = int(analysis.get("score", cv.score or 0) or 0)
    total_score = _combine_scores(dom_score, exp_score, sk_score, cv_quality)

    ai_result = analyze_cv_against_job(
        job_requirements=job_reqs,
        cv_structured=structured,
        cv_analysis=analysis,
        job_title=payload.job_title,
        language=resolved_lang,
        candidate_years=candidate_years,
    )

    return JobMatchResponse(
        cv_id=cv.id,
        file_name=cv.original_filename,
        match_score=total_score,
        skills_match_score=sk_score,
        experience_score=exp_score,
        cv_quality_score=cv_quality,
        overall_verdict=ai_result.get("overall_verdict", ""),
        hire_probability=ai_result.get("hire_probability", "N/A"),
        overall_reason=ai_result.get("overall_reason", ""),
        strengths=ai_result.get("strengths") or [],
        gaps=ai_result.get("gaps") or [],
        actionable_advice=ai_result.get("actionable_advice") or [],
        application_ready=bool(ai_result.get("application_ready", False)),
        job_requirements=job_reqs,
    )


@router.get("/mine", response_model=list[CVRead])
async def list_my_cvs(db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> list[CVRead]:
    return db.query(CV).filter(CV.user_id == current_user.id).all()


@router.post("/suggest-job-query")
async def suggest_job_query(
    payload: SuggestJobQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    cv = db.query(CV).filter(CV.id == payload.cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")

    raw_text = _resolve_raw_text(cv)
    structured: Dict[str, Any] = cv.structured_data or {}
    if isinstance(structured, str):
        try:
            structured = json.loads(structured)
        except Exception:
            structured = {}

    detected_role = ""
    if isinstance(structured, dict):
        personal = structured.get("personal_info") or {}
        detected_role = (personal.get("title", "") or personal.get("job_title", "") or personal.get("headline", "") or "").strip()
        if not detected_role:
            experience = structured.get("experience") or []
            if experience and isinstance(experience[0], dict):
                detected_role = (experience[0].get("title", "") or experience[0].get("position", "") or experience[0].get("role", "") or "").strip()

    if not detected_role and raw_text:
        keyword_roles = [
            ("data scientist", ["data scientist", "machine learning engineer"]),
            ("data analyst", ["data analyst", "business analyst", "analytics"]),
            ("data engineer", ["data engineer", "etl", "data pipeline"]),
            ("devops engineer", ["devops", "site reliability", "platform engineer", "kubernetes"]),
            ("software engineer", ["software engineer", "software developer", "full stack", "frontend", "backend"]),
            ("product manager", ["product manager", "product owner"]),
            ("ux designer", ["ux designer", "ui designer", "product designer", "figma"]),
            ("marketing manager", ["marketing manager", "digital marketing", "seo specialist"]),
            ("financial analyst", ["financial analyst", "finance manager", "accountant", "cpa"]),
            ("hr manager", ["hr manager", "recruiter", "talent acquisition", "human resources"]),
        ]
        text_lower = raw_text.lower()
        for role, keywords in keyword_roles:
            if any(kw in text_lower for kw in keywords):
                detected_role = role.title()
                break

    category_slug = next((slug for kw, slug in _ROLE_TO_CATEGORY.items() if kw in detected_role.lower()), "")
    return {"detected_role": detected_role, "category_slug": category_slug, "suggested_query": detected_role}


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_cv(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)):
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    from app.services.storage.file_storage import delete_cv_file
    delete_cv_file(cv.file_path)
    db.delete(cv)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{cv_id}/action-plan")
async def get_action_plan(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> Dict[str, Any]:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return generate_action_plan({"score": cv.score, "analysis_result": cv.analysis_result or {}, "structured_data": cv.structured_data or {}, "suggestions": cv.suggestions or {}, "original_filename": cv.original_filename})


@router.get("/{cv_id}/pdf")
async def download_cv_pdf(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user), template: str = "classic") -> Response:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    structured = cv.structured_data or {"personal_info": {"name": current_user.full_name or current_user.email}, "summary": "", "experience": [], "education": [], "skills": {}}
    pdf_bytes = generate_cv_pdf_bytes(structured, template=template)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=cv_{cv_id}_{template}.pdf"})


@router.get("/{cv_id}", response_model=CVRead)
async def get_cv(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_supabase_user)) -> CVRead:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.post("/{cv_id}/analyze", response_model=CVRead)
async def analyze_cv(
    cv_id: int,
    language: str = "auto",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    if not cv.extracted_cv or not cv.structured_data:
        try:
            extracted_data = parse_cv_file(cv.file_path, cv.file_type)
            cv.extracted_cv = extracted_data
            raw_text = extracted_data.get("raw_text", "")
            cv.analysis_result = analyze_cv_local(raw_text)
            cv.score = cv.analysis_result.get("score", 0)
            cv.structured_data = extract_structured_data(raw_text)
            db.add(cv)
            db.commit()
            db.refresh(cv)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process CV data: {e}")

    if not cv.extracted_cv:
        raise HTTPException(status_code=500, detail="Failed to extract CV text.")

    resolved_lang = _resolve_cv_language(cv)
    cv.suggestions = review_cv_with_groq(cv.extracted_cv, cv.structured_data, cv.analysis_result, language=resolved_lang)
    cv.analyzed_at = datetime.utcnow()
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.post("/{cv_id}/rewrite", response_model=Dict[str, str])
async def rewrite_cv(
    cv_id: int,
    language: str = "auto",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, str]:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    if not cv.structured_data or not cv.suggestions:
        raise HTTPException(status_code=400, detail="CV must be analyzed before rewriting.")
    resolved_lang = _resolve_cv_language(cv)
    return {"rewritten_cv": rewrite_cv_with_groq(cv.structured_data, cv.suggestions, language=resolved_lang)}
