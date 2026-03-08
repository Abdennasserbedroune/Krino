"""Recruiter endpoints for matching one job profile to multiple CVs.

This is used by the recruiter dashboard to compare a job definition with up to
five stored CVs and return match scores plus natural-language reasons.
Each result now also carries a deterministic HR Toolkit (scorecard + verification
questions) so recruiters can conduct structured interviews without any extra step.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.cv import CV
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.recruiter import (
    HrToolkit,
    JobProfile,
    MatchCvRequest,
    MatchReason,
    MatchResult,
    MatchSessionResponse,
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
        "software",
        "developer",
        "engineer",
        "javascript",
        "typescript",
        "react",
        "node",
        "java",
        "c#",
        "c++",
    ],
    "product management": ["product manager", "roadmap", "backlog", "stakeholder", "kpi"],
    "marketing & growth": ["marketing", "campaign", "seo", "sem", "growth", "branding"],
    "finance & banking": ["finance", "financial", "bank", "investment", "valuation"],
    "design & ux": ["design", "designer", "ux", "ui", "figma", "wireframe", "prototype", "adobe"],
}


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
            detail=f"Some CVs were not found or do not belong to this user: {missing}",
        )

    job = payload.job
    # Resolve once for all CVs in this batch — fallback text is the job domain
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


def _build_job_summary(job: JobProfile) -> str:
    parts: List[str] = []
    if job.domain:
        parts.append(f"Domain: {job.domain}")
    if job.experience_range:
        parts.append(f"Experience range: {job.experience_range}")
    if job.salary_range:
        parts.append(f"Salary range: {job.salary_range}")
    if job.location:
        parts.append(f"Location: {job.location}")
    if job.contract_type:
        parts.append(f"Contract type: {job.contract_type}")
    if job.skills_text:
        parts.append(f"Key skills: {job.skills_text}")
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
