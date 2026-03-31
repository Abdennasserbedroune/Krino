"""Persistent recruiter models: job postings and candidate pipeline cards.

Two new tables introduced here:
  - job_postings   : a recruiter's saved job with scoring config
  - candidate_cards: one row per CV screened against a job, lives in the
                     hiring pipeline and carries all match data + stage
"""
from __future__ import annotations

import enum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class PipelineStage(str, enum.Enum):
    """Ordered stages of a recruiting pipeline."""

    SCREENED  = "screened"
    PHONE     = "phone_screen"
    INTERVIEW = "interview"
    OFFER     = "offer"
    HIRED     = "hired"
    REJECTED  = "rejected"


class JobPosting(Base):
    """A persistent recruiter job posting.

    Replaces the stateless ``JobProfile`` that was discarded after every
    ``/match-cvs`` call.  Storing the full JD text (``jd_text``) lets the
    LLM match against the real role description instead of a short keyword
    summary, and ``scoring_weights`` lets each recruiter tune how domain /
    experience / skills / CV-quality are weighted.
    """

    __tablename__ = "job_postings"

    id           = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Core job fields
    title            = Column(String(200), nullable=False)
    domain           = Column(String(100), nullable=False)
    jd_text          = Column(Text, nullable=True)           # full JD text for LLM
    experience_range = Column(String(50),  nullable=False)
    salary_range     = Column(String(100), nullable=True)
    location         = Column(String(100), nullable=True)
    contract_type    = Column(String(50),  nullable=True)
    skills_text      = Column(Text, nullable=True)

    # Lifecycle
    status = Column(String(20), default="open")              # open | paused | closed

    # Custom scoring weights — falls back to {domain:40,experience:30,skills:20,quality:10}
    # when NULL.  Values must sum to 100.
    scoring_weights = Column(JSON, nullable=True)

    # Relationships
    candidates = relationship(
        "CandidateCard",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    recruiter = relationship("User")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<JobPosting id={self.id} title={self.title!r} recruiter={self.recruiter_id}>"


class CandidateCard(Base):
    """One candidate inside a job pipeline.

    Created (and persisted) every time a CV is screened via the new
    ``POST /recruiter/jobs/{id}/screen`` endpoint.  Carries the full
    scoring breakdown, LLM verdict, HR toolkit, current pipeline stage,
    and recruiter notes so nothing is ever lost between sessions.
    """

    __tablename__ = "candidate_cards"

    id     = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False, index=True)

    # Link to an existing Pathwise CV row — nullable because recruiter-uploaded
    # PDFs do not belong to any registered user account.
    cv_id = Column(Integer, ForeignKey("cvs.id"), nullable=True)

    # Candidate identity (extracted from CV text)
    candidate_name    = Column(String(200), nullable=True)
    candidate_email   = Column(String(200), nullable=True)
    original_filename = Column(String(300), nullable=True)

    # Scoring breakdown (0-100 each)
    match_score      = Column(Integer, nullable=True)
    skills_score     = Column(Integer, nullable=True)
    experience_score = Column(Integer, nullable=True)
    quality_score    = Column(Integer, nullable=True)

    # LLM-generated match narrative
    ai_verdict = Column(Text, nullable=True)
    strengths  = Column(JSON, nullable=True)   # List[str]
    risks      = Column(JSON, nullable=True)   # List[str]

    # Full HR toolkit dict (scorecard rows, verification questions, red flags,
    # recommended_decision) — stored as-is from generate_hr_toolkit()
    hr_toolkit = Column(JSON, nullable=True)

    # Pipeline state
    stage    = Column(String(30), default=PipelineStage.SCREENED)
    moved_at = Column(DateTime, nullable=True)   # timestamp of last stage change

    # Recruiter private notes (auto-saved from the UI)
    notes = Column(Text, nullable=True)

    # How the CV arrived — currently always "upload"; future: "drive", "email"
    source = Column(String(30), nullable=True)

    # Relationships
    job = relationship("JobPosting", back_populates="candidates")
    cv  = relationship("CV")

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<CandidateCard id={self.id} job={self.job_id} "
            f"name={self.candidate_name!r} score={self.match_score} stage={self.stage}>"
        )
