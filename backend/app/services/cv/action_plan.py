"""Deterministic Career Action Plan generator.

Builds a structured action plan from already-computed CV fields:
  - analysis_result  (score, weak_sections, _metrics)
  - structured_data  (skills, experience, education, personal_info)
  - suggestions      (key_weaknesses, improvements, missing_elements, section_changes)

No external API calls — runs instantly and is always available.
"""
from __future__ import annotations

from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_action_plan(cv_data: Dict[str, Any]) -> Dict[str, Any]:
    """Return a Career Action Plan dict from cv_data.

    cv_data expected keys (all optional / may be None):
        score               int 0-100
        analysis_result     dict with weak_sections, _metrics, readability_score
        structured_data     dict with skills, experience, education, personal_info
        suggestions         dict from Groq (key_weaknesses, improvements,
                            missing_elements, section_changes)
        original_filename   str
    """
    score: int = int(cv_data.get("score") or 0)
    analysis: Dict[str, Any] = cv_data.get("analysis_result") or {}
    structured: Dict[str, Any] = cv_data.get("structured_data") or {}
    suggestions: Dict[str, Any] = cv_data.get("suggestions") or {}

    return {
        "score": score,
        "score_band": _score_band(score),
        "fix_checklist": _build_checklist(score, analysis, structured, suggestions),
        "ats_keyword_gaps": _build_keyword_gaps(structured, analysis),
        "proof_prompts": _build_proof_prompts(structured, suggestions),
        "section_health": _build_section_health(structured, analysis),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _score_band(score: int) -> str:
    if score >= 80:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "weak"


def _build_checklist(
    score: int,
    analysis: Dict[str, Any],
    structured: Dict[str, Any],
    suggestions: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Build a prioritised fix checklist.

    Each item: { priority: high|medium|low, text: str, done: bool }
    'done' is always False at generation time — it's togglable in the UI.
    """
    items: List[Dict[str, Any]] = []

    weak_sections: List[str] = analysis.get("weak_sections") or []
    metrics: Dict[str, Any] = analysis.get("_metrics") or {}
    readability: float = float(analysis.get("readability_score") or 50)

    # --- From local analysis ---
    for ws in weak_sections:
        items.append({"priority": "high", "text": ws, "done": False})

    if readability < 30:
        items.append({
            "priority": "high",
            "text": "Simplify your writing — readability score is very low. Use shorter sentences and plain language.",
            "done": False,
        })
    elif readability < 50:
        items.append({
            "priority": "medium",
            "text": "Improve readability: shorter bullet points, active verbs, avoid dense paragraphs.",
            "done": False,
        })

    if int(metrics.get("num_skills", 0) or 0) < 5:
        items.append({
            "priority": "high",
            "text": "Add more specific technical and soft skills relevant to your target role.",
            "done": False,
        })

    # --- From Groq suggestions (key_weaknesses / improvements / missing_elements) ---
    for w in (suggestions.get("key_weaknesses") or [])[:3]:
        if isinstance(w, str) and w.strip():
            items.append({"priority": "high", "text": w.strip(), "done": False})

    for imp in (suggestions.get("improvements") or [])[:3]:
        if isinstance(imp, str) and imp.strip():
            items.append({"priority": "medium", "text": imp.strip(), "done": False})

    for me in (suggestions.get("missing_elements") or [])[:3]:
        if isinstance(me, str) and me.strip():
            items.append({"priority": "medium", "text": f"Missing: {me.strip()}", "done": False})

    # --- Structural checks on structured_data ---
    personal: Dict[str, Any] = structured.get("personal_info") or {}
    if not personal.get("email"):
        items.append({"priority": "high", "text": "Add a visible email address to the contact section.", "done": False})
    if not personal.get("linkedin") and not personal.get("phone"):
        items.append({"priority": "medium", "text": "Add LinkedIn profile or phone number to contact info.", "done": False})

    experience: Any = structured.get("experience") or []
    if isinstance(experience, list) and len(experience) == 0:
        items.append({"priority": "high", "text": "No work experience section found — add your work history.", "done": False})

    summary: str = str(structured.get("summary") or "")
    if len(summary.strip()) < 40:
        items.append({"priority": "medium", "text": "Write a professional summary (2-3 sentences) at the top of your CV.", "done": False})

    if score < 60:
        items.append({
            "priority": "low",
            "text": "Consider quantifying achievements with numbers (e.g., 'increased sales by 30%').",
            "done": False,
        })

    # De-duplicate and cap at 12
    seen: set = set()
    deduped: List[Dict[str, Any]] = []
    for item in items:
        key = item["text"][:60]
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    # Sort: high -> medium -> low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    deduped.sort(key=lambda x: priority_order.get(x["priority"], 3))
    return deduped[:12]


def _build_keyword_gaps(
    structured: Dict[str, Any],
    analysis: Dict[str, Any],
) -> List[str]:
    """Return a list of commonly expected CV keywords that seem absent."""
    from app.services.cv.analysis import COMMON_SKILLS

    found_skills_raw: Any = structured.get("skills") or {}
    found_text = ""
    if isinstance(found_skills_raw, dict):
        for v in found_skills_raw.values():
            if isinstance(v, str):
                found_text += " " + v
            elif isinstance(v, list):
                found_text += " " + " ".join(str(x) for x in v)
    elif isinstance(found_skills_raw, list):
        found_text = " ".join(str(s) for s in found_skills_raw)
    elif isinstance(found_skills_raw, str):
        found_text = found_skills_raw

    found_lower = found_text.lower()

    # High-value keywords that are often missing and important for ATS
    ats_important: List[str] = [
        "git", "agile", "scrum", "sql", "python", "docker",
        "aws", "communication", "leadership", "management",
        "problem solving", "teamwork", "analytical", "project management",
    ]

    missing = [
        kw for kw in ats_important
        if kw not in found_lower and kw in COMMON_SKILLS
    ]
    return missing[:8]


def _build_proof_prompts(
    structured: Dict[str, Any],
    suggestions: Dict[str, Any],
) -> List[str]:
    """Generate prompts that ask the candidate to add quantifiable proof."""
    prompts: List[str] = []

    experience: Any = structured.get("experience") or []
    if isinstance(experience, list):
        for i, exp in enumerate(experience[:3]):
            title = ""
            if isinstance(exp, dict):
                title = exp.get("title") or exp.get("role") or exp.get("company") or f"Role #{i + 1}"
            elif isinstance(exp, str):
                title = exp[:60]
            if title:
                prompts.append(
                    f"For '{title}': add 1-2 metrics (%, $, count) to prove your impact."
                )

    for sc in (suggestions.get("section_changes") or {}).items() if isinstance(suggestions.get("section_changes"), dict) else []:
        section_name, change = sc
        if isinstance(change, str) and change.strip():
            prompts.append(f"{section_name.title()}: {change.strip()}")

    if not prompts:
        prompts = [
            "Add quantifiable achievements to each work experience bullet.",
            "Include a professional summary that targets your desired role.",
            "List certifications, online courses, or side projects to show initiative.",
        ]

    return prompts[:6]


def _build_section_health(
    structured: Dict[str, Any],
    analysis: Dict[str, Any],
) -> Dict[str, str]:
    """Return a simple health rating per CV section: ok | warn | missing."""
    health: Dict[str, str] = {}

    # Contact
    personal: Dict[str, Any] = structured.get("personal_info") or {}
    has_contact = bool(personal.get("email") or personal.get("phone") or personal.get("name"))
    health["contact"] = "ok" if has_contact else "missing"

    # Summary
    summary: str = str(structured.get("summary") or "")
    health["summary"] = "ok" if len(summary.strip()) >= 40 else ("warn" if len(summary.strip()) > 0 else "missing")

    # Experience
    experience: Any = structured.get("experience") or []
    exp_count = len(experience) if isinstance(experience, list) else (1 if experience else 0)
    health["experience"] = "ok" if exp_count >= 2 else ("warn" if exp_count == 1 else "missing")

    # Education
    education: Any = structured.get("education") or []
    edu_count = len(education) if isinstance(education, list) else (1 if education else 0)
    health["education"] = "ok" if edu_count >= 1 else "missing"

    # Skills
    skills: Any = structured.get("skills") or {}
    metrics: Dict[str, Any] = analysis.get("_metrics") or {}
    num_skills = int(metrics.get("num_skills", 0) or 0)
    health["skills"] = "ok" if num_skills >= 5 else ("warn" if num_skills >= 2 else "missing")

    return health
