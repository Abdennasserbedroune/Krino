"""Deterministic HR Toolkit generator for recruiters.

Builds an interview scorecard and verification questions from:
  - JobProfile fields (domain, experience_range, skills_text, etc.)
  - MatchResult component scores (experience_score, skills_match_score, cv_quality_score)
  - CV structured_data and analysis_result (weaknesses, missing sections)

No LLM calls — runs instantly, always available.
"""
from __future__ import annotations

from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_hr_toolkit(
    job_domain: str,
    job_skills_text: str,
    experience_range: str,
    match_result_dict: Dict[str, Any],
    cv_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """Return a full HR Toolkit dict for one matched CV.

    Args:
        job_domain:         e.g. 'AI & Data'
        job_skills_text:    comma-separated skills from the job form
        experience_range:   e.g. '2-4 years'
        match_result_dict:  MatchResult as a dict
        cv_analysis:        CV.analysis_result dict (may be empty)

    Returns a dict with keys:
        scorecard               List of competency rows
        verification_questions  List of strings
        red_flags               List of strings
        recommended_decision    str
    """
    exp_score: int = int(match_result_dict.get("experience_score") or 0)
    skills_score: int = int(match_result_dict.get("skills_match_score") or 0)
    quality_score: int = int(match_result_dict.get("cv_quality_score") or 0)
    match_score: int = int(match_result_dict.get("match_score") or 0)
    strengths: List[str] = match_result_dict.get("reasons", {}).get("strengths") or []
    risks: List[str] = match_result_dict.get("reasons", {}).get("risks") or []
    weak_sections: List[str] = (cv_analysis.get("weak_sections") or [])

    return {
        "scorecard": _build_scorecard(exp_score, skills_score, quality_score, job_domain),
        "verification_questions": _build_verification_questions(
            job_domain, job_skills_text, experience_range, risks, weak_sections
        ),
        "red_flags": _build_red_flags(exp_score, skills_score, quality_score, risks, weak_sections),
        "recommended_decision": _recommend(match_score),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Competency definitions per domain
_DOMAIN_COMPETENCIES: Dict[str, List[Dict[str, Any]]] = {
    "ai & data": [
        {"name": "ML / Statistical knowledge", "weight": 30},
        {"name": "Python / Data tools proficiency", "weight": 25},
        {"name": "Communication of insights", "weight": 20},
        {"name": "Problem-solving approach", "weight": 15},
        {"name": "Domain experience", "weight": 10},
    ],
    "software engineering": [
        {"name": "Technical depth", "weight": 30},
        {"name": "System design", "weight": 25},
        {"name": "Code quality / best practices", "weight": 20},
        {"name": "Collaboration & communication", "weight": 15},
        {"name": "Delivery track record", "weight": 10},
    ],
    "product management": [
        {"name": "Customer empathy", "weight": 25},
        {"name": "Roadmap & prioritisation", "weight": 25},
        {"name": "Stakeholder management", "weight": 20},
        {"name": "Data-driven decision making", "weight": 20},
        {"name": "Cross-functional leadership", "weight": 10},
    ],
    "marketing & growth": [
        {"name": "Campaign strategy", "weight": 30},
        {"name": "Data & analytics fluency", "weight": 25},
        {"name": "Content & copywriting", "weight": 20},
        {"name": "SEO / Paid channels", "weight": 15},
        {"name": "Brand understanding", "weight": 10},
    ],
    "finance & banking": [
        {"name": "Financial modelling", "weight": 30},
        {"name": "Regulatory knowledge", "weight": 25},
        {"name": "Analytical rigor", "weight": 20},
        {"name": "Communication of results", "weight": 15},
        {"name": "Team & client management", "weight": 10},
    ],
    "design & ux": [
        {"name": "Portfolio quality", "weight": 30},
        {"name": "UX process & research", "weight": 25},
        {"name": "Tooling (Figma, etc.)", "weight": 20},
        {"name": "Collaboration with devs", "weight": 15},
        {"name": "Iteration & feedback handling", "weight": 10},
    ],
}

_DEFAULT_COMPETENCIES: List[Dict[str, Any]] = [
    {"name": "Role-specific expertise", "weight": 30},
    {"name": "Communication", "weight": 25},
    {"name": "Problem solving", "weight": 25},
    {"name": "Team collaboration", "weight": 20},
]

_SCORE_ANCHORS: List[Dict[str, Any]] = [
    {"score": 1, "label": "Needs Improvement"},
    {"score": 2, "label": "Below Expectations"},
    {"score": 3, "label": "Meets Expectations"},
    {"score": 4, "label": "Exceeds Expectations"},
    {"score": 5, "label": "Exceptional"},
]


def _get_competencies(domain: str) -> List[Dict[str, Any]]:
    key = (domain or "").strip().lower()
    for k, comps in _DOMAIN_COMPETENCIES.items():
        if k in key:
            return comps
    return _DEFAULT_COMPETENCIES


def _build_scorecard(
    exp_score: int,
    skills_score: int,
    quality_score: int,
    domain: str,
) -> List[Dict[str, Any]]:
    """Return scorecard rows with pre-filled scores from match data."""
    competencies = _get_competencies(domain)
    rows: List[Dict[str, Any]] = []
    for comp in competencies:
        # Pre-fill using the closest matching metric
        name_lower = comp["name"].lower()
        if any(kw in name_lower for kw in ["skill", "technical", "tool", "python", "ml", "portfolio", "modell"]):
            raw = skills_score
        elif any(kw in name_lower for kw in ["experience", "delivery", "track"]):
            raw = exp_score
        else:
            raw = quality_score
        # Map 0-100 -> 1-5
        prefilled = max(1, min(5, round(raw / 20)))
        rows.append({
            "competency": comp["name"],
            "weight_pct": comp["weight"],
            "score": prefilled,
            "anchors": _SCORE_ANCHORS,
            "notes": "",
        })
    return rows


def _build_verification_questions(
    domain: str,
    skills_text: str,
    experience_range: str,
    risks: List[str],
    weak_sections: List[str],
) -> List[str]:
    questions: List[str] = []

    # Opening / general fit
    questions.append(
        f"Tell me about your most significant project in the {domain} space — what was your exact contribution and what was the measurable outcome?"
    )

    # Experience verification
    if experience_range:
        questions.append(
            f"This role requires {experience_range} of relevant experience. Walk me through your timeline in this field, month by month if needed."
        )

    # Skills verification
    if skills_text:
        skills_list = [s.strip() for s in skills_text.replace(";", ",").split(",") if s.strip()][:3]
        for skill in skills_list:
            questions.append(
                f"Rate yourself 1-10 on {skill}. Describe a scenario where you applied it under pressure."
            )

    # Risk probing (from Groq reasons)
    for risk in risks[:2]:
        if isinstance(risk, str) and risk.strip():
            questions.append(
                f"I noticed a potential gap: '{risk}'. How would you address this in the first 90 days?"
            )

    # Weak section probing
    for ws in weak_sections[:2]:
        if isinstance(ws, str) and ws.strip() and "empty" not in ws.lower():
            questions.append(f"Your CV shows: '{ws}'. Can you elaborate on this area?")

    # Closing
    questions.append("What's the single most impactful thing you could bring to this team in the first 3 months?")

    return questions[:8]


def _build_red_flags(
    exp_score: int,
    skills_score: int,
    quality_score: int,
    risks: List[str],
    weak_sections: List[str],
) -> List[str]:
    flags: List[str] = []

    if exp_score < 40:
        flags.append("Experience is significantly below the required range — verify actual years in interview.")
    if skills_score < 35:
        flags.append("Very low skills overlap with the job description — confirm proficiency in core skills.")
    if quality_score < 30:
        flags.append("CV quality is poor — may indicate lack of attention to detail.")
    for risk in risks[:3]:
        if isinstance(risk, str) and risk.strip():
            flags.append(risk.strip())
    for ws in weak_sections[:2]:
        if isinstance(ws, str) and ws.strip():
            flags.append(f"CV flag: {ws.strip()}")

    return flags[:6]


def _recommend(match_score: int) -> str:
    if match_score >= 75:
        return "Strongly recommend advancing to next stage."
    if match_score >= 55:
        return "Recommend interviewing — verify key gaps before decision."
    if match_score >= 40:
        return "Borderline — only advance if pool is small or role is hard to fill."
    return "Not recommended — significant gaps in experience or skills alignment."
