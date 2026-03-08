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


# ─── Schemas ───────────────────────────────────────────────────────────────────────────────
class JobMatchRequest(BaseModel):
    cv_id: int
    job_category: str = Field(default="", description="Domain category selected by user")
    job_title: str = Field(default="", description="Specific job title (optional)")
    job_description: str = Field(
        default="",
        max_length=5000,
        description="Raw job description pasted by user. Capped at 5000 chars.",
    )
    experience_required: str = Field(default="", description="e.g. '3-5 years' or 'Senior'")
    skills_required: str = Field(default="", description="Comma-separated skills from the form")
    language: Literal["en", "fr", "auto"] = Field(
        default="en",
        description="Language for AI-generated analysis responses",
    )


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


# ─── Scoring helpers ───────────────────────────────────────────────────────────────────────
import re

_YEARS_RE = re.compile(r"(\d{1,2})\+?\s+years?", re.IGNORECASE)

_DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "ai & data": ["data", "analytics", "machine learning", "ml", "ai", "python", "sql"],
    "software engineering": [
        "software", "developer", "engineer", "javascript", "typescript",
        "react", "node", "java", "c#", "c++",
    ],
    "product management": ["product manager", "roadmap", "backlog", "stakeholder", "kpi"],
    "marketing & growth": ["marketing", "campaign", "seo", "sem", "growth", "branding"],
    "finance & banking": ["finance", "financial", "bank", "investment", "valuation"],
    "design & ux": ["design", "designer", "ux", "ui", "figma", "wireframe", "prototype", "adobe"],
}

_ROLE_TO_CATEGORY: Dict[str, str] = {
    "data analyst": "data",
    "data scientist": "data",
    "data engineer": "data",
    "analytics": "data",
    "machine learning": "data",
    "software engineer": "software-dev",
    "software developer": "software-dev",
    "full stack": "software-dev",
    "frontend": "software-dev",
    "backend": "software-dev",
    "react": "software-dev",
    "node": "software-dev",
    "python developer": "software-dev",
    "devops": "devops-sysadmin",
    "sre": "devops-sysadmin",
    "site reliability": "devops-sysadmin",
    "cloud engineer": "devops-sysadmin",
    "kubernetes": "devops-sysadmin",
    "product manager": "product",
    "product owner": "product",
    "ux designer": "design",
    "ui designer": "design",
    "graphic designer": "design",
    "figma": "design",
    "marketing": "marketing",
    "seo": "marketing",
    "growth": "marketing",
    "financial analyst": "finance",
    "accountant": "finance",
    "finance": "finance",
    "hr manager": "hr",
    "recruiter": "hr",
    "talent acquisition": "hr",
    "content writer": "writing",
    "copywriter": "writing",
    "technical writer": "writing",
    "qa engineer": "qa",
    "test automation": "qa",
    "quality assurance": "qa",
    "customer success": "customer-support",
    "support": "customer-support",
    "project manager": "management-finance",
    "scrum master": "management-finance",
    "program manager": "management-finance",
    "lawyer": "legal",
    "legal": "legal",
    "compliance": "legal",
    "paralegal": "legal",
    "teacher": "education",
    "trainer": "education",
    "e-learning": "education",
    "sales": "business",
    "account executive": "business",
    "business development": "business",
}


def _parse_candidate_years(text: str) -> int:
    matches = _YEARS_RE.findall(text or "")
    if not matches:
        return 0
    try:
        return max(int(m) for m in matches)
    except ValueError:
        return 0


def _parse_required_years(range_str: str) -> int:
    digits = re.findall(r"\d+", range_str or "")
    if not digits:
        return 0
    if len(digits) == 1:
        return int(digits[0])
    return int((int(digits[0]) + int(digits[1])) / 2)


def _experience_score(candidate_years: int, required_range: str) -> int:
    required = _parse_required_years(required_range)
    if required <= 0:
        return 60
    if candidate_years <= 0:
        return 30
    shortfall = required - candidate_years
    if shortfall >= 4:
        return 20
    if shortfall >= 2:
        return 35
    if shortfall > 0:
        return 50
    extra = candidate_years - required
    if extra <= 1:
        return 90
    if extra <= 3:
        return 80
    return 70


def _domain_score(domain: str, raw_text: str) -> int:
    base = (domain or "").strip().lower()
    keywords = None
    for key, kws in _DOMAIN_KEYWORDS.items():
        if key in base:
            keywords = kws
            break
    if not keywords:
        return 60
    text_lower = (raw_text or "").lower()
    hits = sum(1 for kw in keywords if kw in text_lower)
    if hits == 0:
        return 20
    return max(30, min(95, int((hits / len(keywords)) * 100)))


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
    if not intersection:
        return 25
    return max(40, min(95, int((len(intersection) / len(job_tokens)) * 100)))


def _combine_scores(domain: int, experience: int, skills: int, quality: int) -> int:
    total = 0.35 * domain + 0.30 * experience + 0.25 * skills + 0.10 * quality
    return max(0, min(100, int(total)))


def _resolve_raw_text(cv: CV) -> str:
    """Return the best available raw text from a CV record, or empty string."""
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


# ─── Endpoints ──────────────────────────────────────────────────────────────────────────────
@router.get("/db-test")
def test_db():
    from app.db.session import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
            cvs_count = db.execute(text("SELECT COUNT(*) FROM cvs")).scalar()
            return {"status": "ok", "users": users_count, "cvs": cvs_count}
        except Exception as e:
            return {"status": "error", "detail": str(e), "type": "query_error"}
        finally:
            db.close()
    except Exception as e:
        return {"status": "error", "detail": str(e), "type": "connection_error"}


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
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {settings.ALLOWED_FILE_TYPES}",
        )

    existing_cv = db.query(CV).filter(
        CV.user_id == current_user.id,
        CV.original_filename == file.filename,
    ).first()
    if existing_cv:
        raise HTTPException(
            status_code=409,
            detail=f"A file named '{file.filename}' already exists. Rename or delete it first.",
        )

    file_path, file_size, ext = await save_cv_file(current_user.id, file)

    if file_size > settings.MAX_UPLOAD_SIZE:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    try:
        extracted_data = parse_cv_file(file_path, ext)
    except Exception as exc:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not extract text from the uploaded file. "
                "Make sure it is not password-protected or a scanned image. "
                f"Details: {exc}"
            ),
        ) from exc

    if extracted_data.get("page_count", 0) > 5:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(status_code=400, detail="File has too many pages (max 5)")

    raw_text = (extracted_data.get("raw_text", "") or "").strip()
    if not raw_text:
        from app.services.storage.file_storage import delete_cv_file
        delete_cv_file(file_path)
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found in the uploaded file. "
                "It may be a scanned image PDF. "
                "Please upload a text-based PDF or DOCX."
            ),
        )

    try:
        analysis_result = analyze_cv_local(raw_text)
    except Exception:
        analysis_result = {"score": 0}

    try:
        structured_data = extract_structured_data(raw_text)
    except Exception:
        structured_data = {}

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


@router.post(
    "/match-to-job",
    response_model=JobMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Match one of the user's CVs against a pasted job description.",
)
async def match_cv_to_job(
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> JobMatchResponse:
    """Two-step AI pipeline: extract job requirements then analyse CV against them."""
    try:
        return await _do_match_cv_to_job(payload, db, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Match analysis failed: {exc}",
        ) from exc


async def _do_match_cv_to_job(
    payload: JobMatchRequest,
    db: Session,
    current_user: User,
) -> JobMatchResponse:
    cv = db.query(CV).filter(
        CV.id == payload.cv_id,
        CV.user_id == current_user.id,
    ).first()
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

    candidate_years = _parse_candidate_years(raw_text)
    exp_score = _experience_score(candidate_years, payload.experience_required)
    dom_score = _domain_score(payload.job_category, raw_text)

    # Resolve language once — fallback to detecting from job description text
    resolved_lang = resolve_language(payload.language, fallback_text=payload.job_description)

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


# ─── /mine and /suggest-job-query MUST come before /{cv_id} ─────────────────────
@router.get("/mine", response_model=list[CVRead])
async def list_my_cvs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> list[CVRead]:
    """List CVs uploaded by the current user."""
    cvs = db.query(CV).filter(CV.user_id == current_user.id).all()
    return cvs


@router.post("/suggest-job-query")
async def suggest_job_query(
    payload: SuggestJobQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    """Infer a job search query and Remotive category slug from the user's CV."""
    cv = db.query(CV).filter(
        CV.id == payload.cv_id,
        CV.user_id == current_user.id,
    ).first()
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
        detected_role = (
            personal.get("title", "")
            or personal.get("job_title", "")
            or personal.get("headline", "")
            or ""
        ).strip()

        if not detected_role:
            experience = structured.get("experience") or []
            if experience and isinstance(experience, list):
                first = experience[0] if isinstance(experience[0], dict) else {}
                detected_role = (
                    first.get("title", "")
                    or first.get("position", "")
                    or first.get("role", "")
                    or ""
                ).strip()

    if not detected_role and raw_text:
        text_lower = raw_text.lower()
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
            ("content writer", ["content writer", "copywriter", "technical writer"]),
            ("qa engineer", ["qa engineer", "quality assurance", "test automation", "sdet"]),
            ("project manager", ["project manager", "scrum master", "program manager", "agile coach"]),
            ("lawyer", ["lawyer", "attorney", "legal counsel", "paralegal", "compliance officer"]),
            ("sales manager", ["sales manager", "account executive", "business development"]),
            ("customer success", ["customer success", "customer support", "help desk"]),
        ]
        for role, keywords in keyword_roles:
            if any(kw in text_lower for kw in keywords):
                detected_role = role.title()
                break

    category_slug = ""
    role_lower = detected_role.lower()
    for keyword, slug in _ROLE_TO_CATEGORY.items():
        if keyword in role_lower:
            category_slug = slug
            break

    return {
        "detected_role": detected_role,
        "category_slug": category_slug,
        "suggested_query": detected_role,
    }


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> None:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    from app.services.storage.file_storage import delete_cv_file
    delete_cv_file(cv.file_path)

    db.delete(cv)
    db.commit()
    return None


@router.get("/{cv_id}/action-plan")
async def get_action_plan(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, Any]:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    cv_data = {
        "score": cv.score,
        "analysis_result": cv.analysis_result or {},
        "structured_data": cv.structured_data or {},
        "suggestions": cv.suggestions or {},
        "original_filename": cv.original_filename,
    }
    return generate_action_plan(cv_data)


@router.get("/{cv_id}/pdf")
async def download_cv_pdf(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
    template: str = "classic",
) -> Response:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    structured = cv.structured_data or {
        "personal_info": {"name": current_user.full_name or current_user.email},
        "summary": "",
        "experience": [],
        "education": [],
        "skills": {},
    }

    pdf_bytes = generate_cv_pdf_bytes(structured, template=template)
    filename = f"cv_{cv_id}_{template}.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/{cv_id}", response_model=CVRead)
async def get_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.post("/{cv_id}/analyze", response_model=CVRead)
async def analyze_cv(
    cv_id: int,
    language: str = "en",
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

            analysis_result = analyze_cv_local(raw_text)
            cv.analysis_result = analysis_result
            cv.score = analysis_result.get("score", 0)

            structured_data = extract_structured_data(raw_text)
            cv.structured_data = structured_data

            db.add(cv)
            db.commit()
            db.refresh(cv)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process CV data: {e}")

    if not cv.extracted_cv:
        raise HTTPException(status_code=500, detail="Failed to extract CV text.")

    resolved_lang = resolve_language(language, fallback_text="")
    suggestions = review_cv_with_groq(
        cv.extracted_cv,
        cv.structured_data,
        cv.analysis_result,
        language=resolved_lang,
    )

    cv.suggestions = suggestions
    cv.analyzed_at = datetime.utcnow()

    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.post("/{cv_id}/rewrite", response_model=Dict[str, str])
async def rewrite_cv(
    cv_id: int,
    language: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, str]:
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    if not cv.structured_data or not cv.suggestions:
        raise HTTPException(status_code=400, detail="CV must be analyzed before rewriting.")

    resolved_lang = resolve_language(language, fallback_text="")
    rewritten_content = rewrite_cv_with_groq(
        cv.structured_data,
        cv.suggestions,
        language=resolved_lang,
    )
    return {"rewritten_cv": rewritten_content}
