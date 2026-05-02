"""Per-field AI suggestions for CV Builder — on-demand, scoped, fast."""
from __future__ import annotations
import json
from typing import Any, Dict, List

from groq import Groq
from app.core.config import settings


def _groq_text(system: str, user: str, temperature: float = 0.3) -> str:
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=temperature,
            max_tokens=600,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        print(f"[cv_builder ai] Groq failed: {exc}")
        return ""


def suggest_field(
    section: str,
    field: str,
    current_value: str,
    context: Dict[str, Any],
    action: str = "improve",  # improve | tailor | shorten | expand
    jd_text: str = "",
    language: str = "en",
) -> List[str]:
    """Return 2-3 AI variants for a single CV field.

    Parameters
    ----------
    section:       e.g. "experience", "summary", "skills"
    field:         e.g. "bullet_2", "summary_text"
    current_value: the text the user has written so far
    context:       neighbouring fields for coherence (role title, company …)
    action:        what the user wants to do with the value
    jd_text:       job description text for "tailor" action
    language:      "en" or "fr"
    """
    lang_note = "Respond in French." if language == "fr" else "Respond in English."
    jd_block = f"\nTARGET JD:\n{jd_text[:1500]}" if jd_text and action == "tailor" else ""
    action_map = {
        "improve":  "Rewrite the following CV text to be stronger, more impactful, and ATS-friendly.",
        "tailor":   "Rewrite the following CV text to better match the target job description.",
        "shorten":  "Shorten the following CV text to 1 concise, impactful sentence.",
        "expand":   "Expand the following CV text with specific achievements and metrics.",
    }
    instruction = action_map.get(action, action_map["improve"])

    system = (
        f"You are an expert CV writer. {lang_note} "
        "Return exactly 3 numbered variants (1. … 2. … 3. …). "
        "Each variant should be distinct. No preamble."
    )
    user = (
        f"SECTION: {section} | FIELD: {field}\n"
        f"CONTEXT: {json.dumps(context)[:400]}\n"
        f"{jd_block}\n"
        f"CURRENT TEXT: {current_value}\n\n"
        f"{instruction}\n"
        "Return 3 numbered variants only."
    )
    raw = _groq_text(system, user)
    # Parse numbered list
    lines = [l.strip() for l in raw.split("\n") if l.strip()]
    variants = []
    for line in lines:
        for prefix in ("1.", "2.", "3."):
            if line.startswith(prefix):
                variants.append(line[len(prefix):].strip())
    return variants[:3] if variants else [raw[:300]]


def score_draft_ats(draft: Dict[str, Any]) -> int:
    """Quick ATS score 0-100 for a CVDraft based on completeness and keyword density."""
    score = 0
    if draft.get("basics"):
        score += 15
    if draft.get("summary") and len(draft["summary"]) > 50:
        score += 10
    exp = draft.get("experience") or []
    if exp:
        score += min(30, len(exp) * 10)
    edu = draft.get("education") or []
    if edu:
        score += 10
    skills = draft.get("skills") or []
    if skills:
        score += min(15, len(skills) * 3)
    if draft.get("certifications"):
        score += 5
    if draft.get("projects"):
        score += 10
    if draft.get("languages"):
        score += 5
    return min(100, score)
