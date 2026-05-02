"""Application tracker models — job seeker side."""
from __future__ import annotations
import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class ApplicationStage(str, enum.Enum):
    SAVED     = "saved"
    APPLIED   = "applied"
    PHONE     = "phone_screen"
    INTERVIEW = "interview"
    OFFER     = "offer"
    REJECTED  = "rejected"
    ARCHIVED  = "archived"


class SavedJob(Base):
    """Canonical JD record — shared between tracker, CV-builder, and JD tools."""
    __tablename__ = "saved_jobs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String(200), nullable=False)
    company    = Column(String(200), nullable=True)
    location   = Column(String(200), nullable=True)
    work_mode  = Column(String(50),  nullable=True)   # remote / hybrid / onsite
    seniority  = Column(String(50),  nullable=True)
    salary     = Column(String(100), nullable=True)
    url        = Column(String(1000), nullable=True)
    jd_raw     = Column(Text,  nullable=True)         # full raw JD text
    jd_parsed  = Column(JSON,  nullable=True)         # normalised fields
    jd_score   = Column(JSON,  nullable=True)         # quality-score result
    source     = Column(String(50),  nullable=True)   # paste / url / extension
    created_at = Column(DateTime, server_default=func.now())

    applications = relationship(
        "JobApplication", back_populates="job", cascade="all, delete-orphan"
    )
    user = relationship("User")


class JobApplication(Base):
    """One job application entry in the seeker tracker."""
    __tablename__ = "job_applications"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id       = Column(Integer, ForeignKey("saved_jobs.id"), nullable=False)
    cv_id        = Column(Integer, ForeignKey("cvs.id"), nullable=True)

    stage        = Column(String(30), default=ApplicationStage.SAVED)
    applied_at   = Column(DateTime, nullable=True)
    follow_up_at = Column(DateTime, nullable=True)
    notes        = Column(Text, nullable=True)
    match_score  = Column(Integer, nullable=True)   # cached from analysis
    events       = Column(JSON,    nullable=True)   # [{type, date, note}]
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    job  = relationship("SavedJob", back_populates="applications")
    cv   = relationship("CV")
    user = relationship("User")
