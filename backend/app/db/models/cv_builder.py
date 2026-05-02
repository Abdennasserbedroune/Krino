"""CV Builder model — structured resume drafts with version history."""
from __future__ import annotations
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class CVDraft(Base):
    """Structured resume draft with per-section data and ATS score history."""
    __tablename__ = "cv_drafts"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title    = Column(String(200), default="Untitled Resume")
    template = Column(String(50),  default="classic")   # classic / modern / compact
    language = Column(String(10),  default="en")
    is_active = Column(Boolean, default=True)

    # Section data (Reactive Resume-inspired schema)
    basics         = Column(JSON, nullable=True)  # name, email, phone, location, links
    summary        = Column(Text, nullable=True)
    experience     = Column(JSON, nullable=True)  # [{title, company, dates, bullets[]}]
    education      = Column(JSON, nullable=True)  # [{degree, institution, dates, gpa}]
    skills         = Column(JSON, nullable=True)  # [{category, items[]}]
    projects       = Column(JSON, nullable=True)
    certifications = Column(JSON, nullable=True)
    languages      = Column(JSON, nullable=True)
    custom_sections = Column(JSON, nullable=True) # [{label, items[]}]

    # Layout / style
    layout = Column(JSON, nullable=True)  # column widths, section order, colors, fonts

    # Scoring
    ats_score      = Column(Integer, nullable=True)
    last_scored_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user     = relationship("User")
    versions = relationship(
        "CVDraftVersion", back_populates="draft", cascade="all, delete-orphan"
    )


class CVDraftVersion(Base):
    """Immutable snapshot of a CVDraft — enables score history and diff view."""
    __tablename__ = "cv_draft_versions"

    id          = Column(Integer, primary_key=True, index=True)
    draft_id    = Column(Integer, ForeignKey("cv_drafts.id"), nullable=False, index=True)
    version_num = Column(Integer, nullable=False)
    snapshot    = Column(JSON, nullable=False)   # full draft content at save time
    ats_score   = Column(Integer, nullable=True)
    change_note = Column(String(300), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    draft = relationship("CVDraft", back_populates="versions")
