"""Recruiter endpoints for matching one job profile to multiple CVs.

This is used by the recruiter dashboard to compare a job definition with up to
five stored CVs and return match scores plus natural-language reasons.
Each result now also carries a deterministic HR Toolkit (scorecard + verification
questions) so recruiters can conduct structured interviews without any extra step.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.cv import CV
from app.db.models.recruiter import CandidateCard, JobPosting, PipelineStage
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.recruiter import (
    CandidateCardOut,
    CandidateNoteUpdate,
    CandidateStageUpdate,
    HrToolkit,
    JobPostingCreate,
    JobPostingOut,
    JobPostingUpdate,
    JobProfile,
    MatchCvRequest,
    MatchReason,
    MatchResult,
    MatchSessionResponse,
    PipelineResponse,
    ScorecardRow,
)
from app.services.ai.groq_client import match_cv_to_job_with_groq
from app.services.ai.language_utils import resolve_language
from app.services.cv.analysis import analyze_cv_local
from app.services.cv.structure import extract_structured_data
from app.services.cv.text_extraction import extract_text_from_file
from app.services.recruiter.hr_toolkit import generate_hr_toolkit

router = APIRouter(prefix="/recruiter", tags=["recruiter"])


YEARS_REGEX = re.compile(r"(\d{1,2})\+?\s+years?", re.IGNORECASE)

DOMAIN_KEYWORDS: Dict[str, List[str]] = {
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


# ============================================================================
# LEGACY ENDPOINT — POST /recruiter/match-cvs  (DO NOT MODIFY)
# ============================================================================

@router.post(
    "/match-cvs",
    response_model=MatchSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Match a job profile to up to five CVs and return scores plus reasons.",
)
async def match_cvs_to_job(
    payload: MatchCvRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> MatchSessionResponse:
    """Compare a single job profile with multiple CVs and return match scores."""
    if not payload.cv_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one CV id is required.",
        )
    if len(payload.cv_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can match at most 5 CVs at a time.",
        )

    cvs: List[CV] = (
        db.query(CV)
        .filter(CV.user_id == current_user.id, CV.id.in_(payload.cv_ids))
        .all()
    )

    if not cvs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No CVs found for this user.",
        )

    found_ids = {cv.id for cv in cvs}
    missing = [cv_id for cv_id in payload.cv_ids if cv_id not in found_ids]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some CVs were not found or do not belong to this user: " + str(missing),
        )

    job = payload.job
    resolved_lang = resolve_language(payload.language, fallback_text=job.domain)
    results: List[MatchResult] = []

    for cv in cvs:
        raw_text, analysis, structured = _ensure_cv_data(cv, db)

        candidate_years = _parse_years_experience(raw_text)
        experience_score = _compute_experience_score(candidate_years, job.experience_range)
        domain_score = _compute_domain_match_score(job.domain, raw_text)
        skills_score = _compute_skills_overlap_score(job.skills_text or "", structured.get("skills") or [])

        cv_quality_score = int(analysis.get("score", cv.score or 0) or 0)

        total_score = _combine_scores(
            domain_score=domain_score,
            experience_score=experience_score,
            skills_score=skills_score,
            cv_quality_score=cv_quality_score,
        )

        job_summary = _build_job_summary(job)
        cv_summary = raw_text[:4000] if raw_text else json.dumps(structured, indent=2)[:4000]

        reasons_dict = match_cv_to_job_with_groq(
            job_summary,
            cv_summary,
            language=resolved_lang,
        )
        reasons = MatchReason(
            overall_reason=reasons_dict.get("overall_reason", "No explanation available."),
            strengths=reasons_dict.get("strengths", []) or [],
            risks=reasons_dict.get("risks", []) or [],
        )

        match_result_dict = {
            "match_score": total_score,
            "experience_score": experience_score,
            "skills_match_score": skills_score,
            "cv_quality_score": cv_quality_score,
            "reasons": {
                "strengths": reasons.strengths,
                "risks": reasons.risks,
            },
        }
        toolkit_dict = generate_hr_toolkit(
            job_domain=job.domain,
            job_skills_text=job.skills_text or "",
            experience_range=job.experience_range,
            match_result_dict=match_result_dict,
            cv_analysis=analysis,
        )
        hr_toolkit = HrToolkit(
            scorecard=[
                ScorecardRow(
                    competency=row["competency"],
                    weight_pct=row["weight_pct"],
                    score=row["score"],
                    notes=row.get("notes", ""),
                )
                for row in toolkit_dict["scorecard"]
            ],
            verification_questions=toolkit_dict["verification_questions"],
            red_flags=toolkit_dict["red_flags"],
            recommended_decision=toolkit_dict["recommended_decision"],
        )

        results.append(
            MatchResult(
                cv_id=cv.id,
                file_name=cv.original_filename,
                match_score=total_score,
                skills_match_score=skills_score,
                experience_score=experience_score,
                cv_quality_score=cv_quality_score,
                reasons=reasons,
                hr_toolkit=hr_toolkit,
            )
        )

    results_sorted = sorted(results, key=lambda r: r.match_score, reverse=True)
    return MatchSessionResponse(job=job, results=results_sorted)


# ============================================================================
# PIPELINE HELPERS — shared by all new persistent endpoints
# ============================================================================

DEFAULT_WEIGHTS: Dict[str, int] = {
    "domain": 40,
    "experience": 30,
    "skills": 20,
    "quality": 10,
}


def _job_with_count(job: JobPosting, db: Session) -> JobPostingOut:
    """Build a JobPostingOut response, injecting the live candidate count."""
    count = db.query(CandidateCard).filter(CandidateCard.job_id == job.id).count()
    out = JobPostingOut.model_validate(job)
    out.candidate_count = count
    return out


def _get_job_or_404(job_id: int, user: User, db: Session) -> JobPosting:
    """Fetch a job posting that belongs to *user* or raise 404."""
    job = (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id, JobPosting.recruiter_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


def _get_card_or_404(card_id: int, user: User, db: Session) -> CandidateCard:
    """Fetch a candidate card whose parent job belongs to *user* or raise 404."""
    card = (
        db.query(CandidateCard)
        .join(JobPosting, JobPosting.id == CandidateCard.job_id)
        .filter(CandidateCard.id == card_id, JobPosting.recruiter_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
        )
    return card


def _score_raw_text(
    raw_text: str,
    job: JobPosting,
    weights: Dict[str, int],
) -> Tuple[int, int, int, int]:
    """Return (total, skills, experience, quality) scores for a CV text block."""
    structured = extract_structured_data(raw_text)
    analysis = analyze_cv_local(raw_text)

    candidate_years = _parse_years_experience(raw_text)
    exp_score = _compute_experience_score(candidate_years, job.experience_range)
    dom_score = _compute_domain_match_score(job.domain, raw_text)
    skl_score = _compute_skills_overlap_score(
        job.skills_text or "", structured.get("skills") or []
    )
    qual_score = int(analysis.get("score", 50) or 50)

    total = (
        weights.get("domain", 40)     * dom_score  / 100
        + weights.get("experience", 30) * exp_score  / 100
        + weights.get("skills", 20)     * skl_score  / 100
        + weights.get("quality", 10)    * qual_score / 100
    )
    return max(0, min(100, int(total))), skl_score, exp_score, qual_score


# ============================================================================
# JOB CRUD — POST / GET / PATCH / DELETE
# ============================================================================

@router.post(
    "/jobs",
    response_model=JobPostingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new persistent job posting.",
)
async def create_job(
    payload: JobPostingCreate,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    job = JobPosting(**payload.model_dump(), recruiter_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_with_count(job, db)


@router.get(
    "/jobs",
    response_model=List[JobPostingOut],
    summary="List all job postings for the authenticated recruiter.",
)
async def list_jobs(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> List[JobPostingOut]:
    q = db.query(JobPosting).filter(JobPosting.recruiter_id == current_user.id)
    if status_filter:
        q = q.filter(JobPosting.status == status_filter)
    jobs = q.order_by(JobPosting.created_at.desc()).all()
    return [_job_with_count(j, db) for j in jobs]


@router.get(
    "/jobs/{job_id}",
    response_model=JobPostingOut,
    summary="Get a single job posting by ID.",
)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    job = _get_job_or_404(job_id, current_user, db)
    return _job_with_count(job, db)


@router.patch(
    "/jobs/{job_id}",
    response_model=JobPostingOut,
    summary="Partially update a job posting (title, status, weights, etc.).",
)
async def update_job(
    job_id: int,
    payload: JobPostingUpdate,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    job = _get_job_or_404(job_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return _job_with_count(job, db)


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a job posting and all its candidate cards.",
)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> Response:
    job = _get_job_or_404(job_id, current_user, db)
    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================================
# PIPELINE — Kanban board data
# ============================================================================

@router.get(
    "/jobs/{job_id}/pipeline",
    response_model=PipelineResponse,
    summary="Get all candidates grouped by pipeline stage (Kanban board data).",
)
async def get_pipeline(
    job_id: int,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> PipelineResponse:
    job = _get_job_or_404(job_id, current_user, db)
    cards = (
        db.query(CandidateCard)
        .filter(CandidateCard.job_id == job_id)
        .order_by(CandidateCard.match_score.desc())
        .all()
    )
    pipeline: Dict[str, List[CandidateCardOut]] = {
        stage.value: [] for stage in PipelineStage
    }
    for card in cards:
        stage_key = card.stage or PipelineStage.SCREENED.value
        if stage_key in pipeline:
            pipeline[stage_key].append(CandidateCardOut.model_validate(card))
        else:
            pipeline[PipelineStage.SCREENED.value].append(
                CandidateCardOut.model_validate(card)
            )

    return PipelineResponse(
        job=_job_with_count(job, db),
        pipeline=pipeline,
        total_candidates=len(cards),
    )


# ============================================================================
# CANDIDATE CARD MUTATIONS — stage move + notes
# ============================================================================

@router.patch(
    "/candidates/{card_id}/stage",
    response_model=CandidateCardOut,
    summary="Move a candidate to a new pipeline stage.",
)
async def move_stage(
    card_id: int,
    payload: CandidateStageUpdate,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> CandidateCardOut:
    card = _get_card_or_404(card_id, current_user, db)
    card.stage = payload.stage
    card.moved_at = datetime.utcnow()
    db.commit()
    db.refresh(card)
    return CandidateCardOut.model_validate(card)


@router.patch(
    "/candidates/{card_id}/notes",
    response_model=CandidateCardOut,
    summary="Add or update recruiter private notes on a candidate card.",
)
async def update_notes(
    card_id: int,
    payload: CandidateNoteUpdate,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> CandidateCardOut:
    card = _get_card_or_404(card_id, current_user, db)
    card.notes = payload.notes
    db.commit()
    db.refresh(card)
    return CandidateCardOut.model_validate(card)


# ============================================================================
# BATCH SCREEN — upload PDFs → score → persist as CandidateCards
# ============================================================================

@router.post(
    "/jobs/{job_id}/screen",
    response_model=List[CandidateCardOut],
    status_code=status.HTTP_201_CREATED,
    summary="Upload up to 10 CVs, screen them against a job, persist results.",
)
async def screen_candidates(
    job_id: int,
    files: List[UploadFile] = File(..., description="PDF or DOCX CV files, max 10"),
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> List[CandidateCardOut]:
    """Upload CV files, score each one against the job, and persist CandidateCards.

    Reuses all existing scoring helpers and Groq LLM calls from /match-cvs.
    Returns cards sorted by match_score descending.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="At least one CV file is required."
        )
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 10 CVs per screen run."
        )

    job = _get_job_or_404(job_id, current_user, db)
    weights = job.scoring_weights or DEFAULT_WEIGHTS
    resolved_lang = resolve_language("auto", fallback_text=job.domain)

    jd_for_match = job.jd_text or _build_job_summary(
        JobProfile(
            domain=job.domain,
            experience_range=job.experience_range,
            salary_range=job.salary_range or "",
            location=job.location,
            contract_type=job.contract_type,
            skills_text=job.skills_text,
        )
    )

    created_cards: List[CandidateCard] = []

    for upload in files:
        suffix = os.path.splitext(upload.filename or "cv.pdf")[1].lower() or ".pdf"
        file_type = suffix.lstrip(".")

        raw_bytes = await upload.read()
        tmp_path: Optional[str] = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(raw_bytes)
                tmp_path = tmp.name

            try:
                raw_text = extract_text_from_file(tmp_path, file_type)
            except Exception:
                raw_text = ""
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        total, skl_score, exp_score, qual_score = _score_raw_text(raw_text, job, weights)

        cv_summary = raw_text[:4000] if raw_text else ""
        reasons_dict = match_cv_to_job_with_groq(
            jd_for_match, cv_summary, language=resolved_lang
        )

        match_result_dict = {
            "match_score": total,
            "experience_score": exp_score,
            "skills_match_score": skl_score,
            "cv_quality_score": qual_score,
            "reasons": {
                "strengths": reasons_dict.get("strengths", []),
                "risks":    reasons_dict.get("risks", []),
            },
        }
        toolkit_dict = generate_hr_toolkit(
            job_domain=job.domain,
            job_skills_text=job.skills_text or "",
            experience_range=job.experience_range,
            match_result_dict=match_result_dict,
            cv_analysis=analyze_cv_local(raw_text),
        )

        structured = extract_structured_data(raw_text)
        personal   = structured.get("personal_info") or {}
        name       = personal.get("name") or personal.get("full_name")
        email      = personal.get("email")

        card = CandidateCard(
            job_id=job_id,
            cv_id=None,
            candidate_name=name,
            candidate_email=email,
            original_filename=upload.filename,
            match_score=total,
            skills_score=skl_score,
            experience_score=exp_score,
            quality_score=qual_score,
            ai_verdict=reasons_dict.get("overall_reason"),
            strengths=reasons_dict.get("strengths", []),
            risks=reasons_dict.get("risks", []),
            hr_toolkit=toolkit_dict,
            stage=PipelineStage.SCREENED.value,
            source="upload",
        )
        db.add(card)
        created_cards.append(card)

    db.commit()
    for c in created_cards:
        db.refresh(c)

    sorted_cards = sorted(created_cards, key=lambda c: c.match_score or 0, reverse=True)
    return [CandidateCardOut.model_validate(c) for c in sorted_cards]


# ============================================================================
# SHARED HELPERS
# ============================================================================

def _build_job_summary(job: JobProfile) -> str:
    parts: List[str] = []
    if job.domain:
        parts.append("Domain: " + job.domain)
    if job.experience_range:
        parts.append("Experience range: " + job.experience_range)
    if job.salary_range:
        parts.append("Salary range: " + job.salary_range)
    if job.location:
        parts.append("Location: " + job.location)
    if job.contract_type:
        parts.append("Contract type: " + job.contract_type)
    if job.skills_text:
        parts.append("Key skills: " + job.skills_text)
    return " | ".join(parts)


def _ensure_cv_data(cv: CV, db: Session) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    extracted = cv.extracted_cv or {}
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except Exception:
            extracted = {}

    raw_text = ""
    if isinstance(extracted, dict) and extracted.get("raw_text"):
        raw_text = str(extracted.get("raw_text"))

    if not raw_text:
        try:
            raw_text = extract_text_from_file(cv.file_path, cv.file_type)
        except Exception:
            raw_text = ""

    analysis: Dict[str, Any] = cv.analysis_result or {}
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except Exception:
            analysis = {}

    if not analysis or "score" not in analysis:
        analysis = analyze_cv_local(raw_text)
        cv.analysis_result = analysis
        cv.score = int(analysis.get("score", 0) or 0)

    structured: Dict[str, Any] = cv.structured_data or {}
    if not structured:
        structured = extract_structured_data(raw_text)
        cv.structured_data = structured

    db.add(cv)
    db.commit()
    db.refresh(cv)

    return raw_text, analysis, structured


def _parse_years_experience(text: str) -> int:
    matches = YEARS_REGEX.findall(text or "")
    if not matches:
        return 0
    try:
        numbers = [int(m) for m in matches]
    except ValueError:
        return 0
    return max(numbers) if numbers else 0


def _parse_required_years(range_str: str) -> int:
    if not range_str:
        return 0
    digits = re.findall(r"\d+", range_str)
    if not digits:
        return 0
    if len(digits) == 1:
        return int(digits[0])
    low = int(digits[0])
    high = int(digits[1])
    return int((low + high) / 2)


def _compute_experience_score(candidate_years: int, job_experience_range: str) -> int:
    required = _parse_required_years(job_experience_range)
    if required <= 0:
        return 60
    if candidate_years <= 0:
        return 30
    if candidate_years < required:
        shortfall = required - candidate_years
        if shortfall >= 4:
            return 20
        if shortfall >= 2:
            return 35
        return 50
    extra = candidate_years - required
    if extra <= 1:
        return 90
    if extra <= 3:
        return 80
    return 70


def _normalise_domain(domain: str) -> str:
    d = (domain or "").strip().lower()
    for key in DOMAIN_KEYWORDS.keys():
        if key in d:
            return key
    return d


def _compute_domain_match_score(domain: str, raw_text: str) -> int:
    base = _normalise_domain(domain)
    keywords = DOMAIN_KEYWORDS.get(base)
    if not keywords:
        return 60
    text_lower = (raw_text or "").lower()
    hits = sum(1 for kw in keywords if kw in text_lower)
    if hits == 0:
        return 20
    ratio = hits / len(keywords)
    return max(30, min(95, int(ratio * 100)))


def _compute_skills_overlap_score(job_skills_text: str, cv_skills: Any) -> int:
    job_text = (job_skills_text or "").lower()
    if not job_text:
        return 60
    job_tokens = {token.strip() for token in re.split(r"[,;/]", job_text) if token.strip()}
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
    ratio = len(intersection) / len(job_tokens)
    return max(40, min(95, int(ratio * 100)))


def _combine_scores(
    *,
    domain_score: int,
    experience_score: int,
    skills_score: int,
    cv_quality_score: int,
) -> int:
    total = (
        0.4 * domain_score
        + 0.3 * experience_score
        + 0.2 * skills_score
        + 0.1 * cv_quality_score
    )
    return max(0, min(100, int(total)))
