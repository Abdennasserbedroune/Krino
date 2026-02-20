"""Schemas for recruiter CV-to-job matching."""
from typing import List, Optional

from pydantic import BaseModel


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


class MatchReason(BaseModel):
    """Structured explanation for why a CV matches (or not)."""

    overall_reason: str
    strengths: List[str]
    risks: List[str]


class MatchResult(BaseModel):
    """Single CV match result."""

    cv_id: int
    file_name: str
    match_score: int
    skills_match_score: int
    experience_score: int
    cv_quality_score: int
    reasons: MatchReason


class MatchSessionResponse(BaseModel):
    """Response for a matching run containing all CV results."""

    job: JobProfile
    results: List[MatchResult]
