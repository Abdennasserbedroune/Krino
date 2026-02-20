"""Helpers to build structured CV data from analysis and basic info."""
from typing import Any, Dict, List

from app.db.models.cv import CV
from app.db.models.user import User


def build_structured_from_analysis(cv: CV, user: User) -> Dict[str, Any]:
    """Create a first-pass structured CV JSON from analysis + basic info.

    This is intentionally simple and can be refined later.
    """
    analysis: Dict[str, Any] = cv.analysis_result or {}

    strengths: List[str] = analysis.get("strengths") or []
    weaknesses: List[str] = analysis.get("weaknesses") or []
    recommendations: List[str] = analysis.get("recommendations") or []

    # For now we keep experience/education empty and let the user or
    # future logic enrich it. We still build a coherent structure that
    # the PDF templates can consume.
    structured: Dict[str, Any] = {
        "personal_info": {
            "name": user.full_name or user.email,
            "title": "",
            "email": user.email,
            "phone": "",
            "location": "",
        },
        "summary": _build_summary(strengths, weaknesses),
        "experience": [],
        "education": [],
        "skills": _build_skills(strengths),
        "ai_notes": {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
        },
    }

    return structured


def _build_summary(strengths: List[str], weaknesses: List[str]) -> str:
    if not strengths and not weaknesses:
        return ""
    parts: List[str] = []
    if strengths:
        parts.append("Key strengths: " + "; ".join(strengths[:4]))
    if weaknesses:
        parts.append("Areas to improve: " + "; ".join(weaknesses[:2]))
    return " ".join(parts)


def _build_skills(strengths: List[str]) -> Dict[str, Any]:
    if not strengths:
        return {}
    # Very naive first mapping: treat strengths as general skills.
    return {"Core Strengths": strengths[:10]}
