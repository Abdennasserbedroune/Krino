"""Schemas for recruiter CV-to-job matching.

This file contains two groups of schemas:

1. Legacy stateless schemas (JobProfile → MatchSessionResponse)
   Used by the original ``POST /recruiter/match-cvs`` endpoint.
   Do NOT modify — kept for backwards compatibility.

2. Persistent pipeline schemas (JobPostingCreate → PipelineResponse)
   Used by the new CRUD + pipeline endpoints introduced in the
   recruiter pipeline upgrade (Tasks 1–6).
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# GROUP 1 — Legacy stateless schemas (DO NOT CHANGE)
# ============================================================================

class JobProfile(BaseModel):
    """Lightweight representation of a job definition used for matching."""

    domain: str
    experience_range: str
    salary_range: str
    location: Optional[str] = None
    contract_type: Optional[str] = None
    skills_text: Optional[str] = None


class MatchCvRequest(BaseModel):
    """Payload for matching one job profile to multiple CVs."""

    job: JobProfile
    cv_ids: List[int]
    language: Literal["en", "fr", "auto"] = Field(
        default="en",
        description="Language for AI-generated reasons and match explanations",
    )


class MatchReason(BaseModel):
    """Structured explanation for why a CV matches (or not)."""

    overall_reason: str
    strengths: List[str]
    risks: List[str]


class ScorecardRow(BaseModel):
    """One competency row in the HR interview scorecard."""

    competency: str
    weight_pct: int
    score: int  # 1-5 pre-filled from match metrics; recruiter can override in UI
    notes: str = ""


class HrToolkit(BaseModel):
    """Deterministic HR toolkit generated per matched CV."""

    scorecard: List[ScorecardRow]
    verification_questions: List[str]
    red_flags: List[str]
    recommended_decision: str


class MatchResult(BaseModel):
    """Single CV match result."""

    cv_id: int
    file_name: str
    match_score: int
    skills_match_score: int
    experience_score: int
    cv_quality_score: int
    reasons: MatchReason
    hr_toolkit: Optional[HrToolkit] = None


class MatchSessionResponse(BaseModel):
    """Response for a matching run containing all CV results."""

    job: JobProfile
    results: List[MatchResult]


# ============================================================================
# GROUP 2 — Persistent pipeline schemas (recruiter pipeline upgrade)
# ============================================================================

class JobPostingCreate(BaseModel):
    """Payload for creating a new persistent job posting."""

    title: str = Field(..., min_length=2, max_length=200, description="Job title, e.g. 'Senior Backend Engineer'")
    domain: str = Field(..., description="Role domain matching DOMAIN_KEYWORDS keys")
    jd_text: Optional[str] = Field(
        default=None,
        description="Full job description text. Used by LLM for richer matching "
                    "than the short skills_text summary alone.",
    )
    experience_range: str = Field(..., description="e.g. '3-5 years' or '5+ years'")
    salary_range: Optional[str] = Field(default=None, description="e.g. '$80k–$100k'")
    location: Optional[str] = None
    contract_type: Optional[str] = Field(default=None, description="e.g. 'Full-time', 'Contract'")
    skills_text: Optional[str] = Field(
        default=None,
        description="Comma-separated key skills used for overlap scoring",
    )
    scoring_weights: Optional[Dict[str, int]] = Field(
        default=None,
        description=(
            'Custom score weights. Must contain keys domain, experience, skills, quality '
            'and values must sum to 100. Example: {"domain":40,"experience":30,"skills":20,"quality":10}'
        ),
    )


class JobPostingUpdate(BaseModel):
    """Partial update payload — every field is optional (PATCH semantics)."""

    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    domain: Optional[str] = None
    jd_text: Optional[str] = None
    experience_range: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    contract_type: Optional[str] = None
    skills_text: Optional[str] = None
    status: Optional[Literal["open", "paused", "closed"]] = None
    scoring_weights: Optional[Dict[str, int]] = None


class JobPostingOut(BaseModel):
    """Response schema for a job posting — returned by all job CRUD endpoints."""

    id: int
    recruiter_id: str
    title: str
    domain: str
    jd_text: Optional[str]
    experience_range: str
    salary_range: Optional[str]
    location: Optional[str]
    contract_type: Optional[str]
    skills_text: Optional[str]
    status: str
    scoring_weights: Optional[Dict[str, int]]
    created_at: datetime
    # Computed at query time — not a DB column
    candidate_count: int = 0

    class Config:
        from_attributes = True


class CandidateStageUpdate(BaseModel):
    """Payload for moving a candidate to a new pipeline stage."""

    stage: Literal[
        "screened",
        "phone_screen",
        "interview",
        "offer",
        "hired",
        "rejected",
    ]


class CandidateNoteUpdate(BaseModel):
    """Payload for updating recruiter notes on a candidate card."""

    notes: str


class CandidateCardOut(BaseModel):
    """Full candidate card response — returned by pipeline and screen endpoints."""

    id: int
    job_id: int
    cv_id: Optional[int]
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    original_filename: Optional[str]

    # Scoring breakdown
    match_score: Optional[int]
    skills_score: Optional[int]
    experience_score: Optional[int]
    quality_score: Optional[int]

    # LLM outputs
    ai_verdict: Optional[str]
    strengths: Optional[List[str]]
    risks: Optional[List[str]]
    hr_toolkit: Optional[Dict[str, Any]]

    # Pipeline state
    stage: str
    notes: Optional[str]
    source: Optional[str]
    created_at: datetime
    moved_at: Optional[datetime]

    class Config:
        from_attributes = True


class PipelineResponse(BaseModel):
    """Kanban board data for a single job posting.

    ``pipeline`` maps each stage name to the list of candidate cards in
    that stage.  All six stages are always present (empty list when no
    candidates) so the frontend can render all columns without defensive
    checks.
    """

    job: JobPostingOut
    # Keys: screened | phone_screen | interview | offer | hired | rejected
    pipeline: Dict[str, List[CandidateCardOut]]
    total_candidates: int
