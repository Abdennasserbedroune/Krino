"""Interview prep generation service."""
from __future__ import annotations
import json
from typing import Any, Dict, List

from groq import Groq
from app.core.config import settings


def _groq_json(system: str, user: str, max_tokens: int = 3000) -> Any:
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
        )
        return json.loads(resp.choices[0].message.content.strip())
    except Exception as exc:
        print(f"[interview_service] Groq failed: {exc}")
        return {}


def generate_prep_pack(
    cv_structured: Dict[str, Any],
    jd_parsed: Dict[str, Any],
    job_title: str = "",
    language: str = "en",
    company_name: str = "",
    seniority: str = "mid",
    jd_text: str = "",
) -> Dict[str, Any]:
    """Generate a full interview prep pack from CV + JD.

    Returns
    -------
    {
      questions:    [{id, type, question}],   # 10 technical questions
      weak_points:  [str],
      star_stories: [{situation, task, action, result, skill}],
      company_fit_points: [str],
    }
    """
    lang_note = "Respond entirely in French." if language == "fr" else "Respond in English."

    seniority_map = {
        "junior":    "Entry-level (0-2 years). Ask foundational questions.",
        "mid":       "Mid-level (2-5 years). Mix conceptual and practical depth.",
        "senior":    "Senior (5-8 years). Expect deep system design and trade-off reasoning.",
        "lead":      "Tech Lead (8-12 years). Focus on architecture, leadership, and cross-team decisions.",
        "principal": "Principal/Staff (12+ years). Questions should be at staff engineer level: org-wide impact, platform design, technical strategy.",
    }
    seniority_instruction = seniority_map.get(seniority, seniority_map["mid"])

    company_context = ""
    if company_name:
        company_context = (
            f"\nCOMPANY: {company_name}. "
            "If this is a well-known tech company (e.g. Meta, Google, Amazon, Capgemini, Microsoft, Shopify, etc.), "
            "tailor technical questions to reflect that company's known tech stack, engineering culture, "
            "system scale, and interview style. For Meta: distributed systems, ranking/feed algorithms, React. "
            "For Amazon: leadership principles, AWS, distributed services. For Google: algorithms, large-scale infra. "
            "For Capgemini/consulting: cloud migration, client delivery, architecture. Adjust accordingly."
        )

    jd_section = ""
    if jd_text:
        jd_section = f"\nJOB DESCRIPTION (verbatim):\n{jd_text[:2000]}"
    elif jd_parsed:
        jd_section = f"\nJOB REQUIREMENTS (parsed):\n{json.dumps(jd_parsed, indent=2)[:1500]}"

    cv_section = ""
    if cv_structured:
        cv_section = f"\nCANDIDATE CV:\n{json.dumps(cv_structured, indent=2)[:2000]}"

    system = (
        "You are a world-class senior interview coach who has conducted thousands of technical interviews "
        "at top-tier companies. " + lang_note + " Return ONLY valid JSON with no markdown, no explanation."
    )

    user = (
        f"JOB TITLE: {job_title}"
        f"{company_context}"
        f"\nSENIORITY: {seniority_instruction}"
        f"{jd_section}"
        f"{cv_section}\n\n"
        "Generate a complete interview prep pack. Return JSON with these exact keys:\n"
        "- questions: array of exactly 10 objects, each: {\"id\": int, \"type\": \"technical\"|\"behavioural\"|\"situational\", \"question\": string}. "
        "At least 6 must be \"technical\". Make them progressively harder. For senior+ roles, include system design and architecture questions. "
        "Questions must be specific to the role, company, and seniority — NOT generic.\n"
        "- weak_points: array of 3 strings — specific skill gaps based on the JD vs CV\n"
        "- star_stories: array of 3 objects {\"situation\": str, \"task\": str, \"action\": str, \"result\": str, \"skill\": str} based on real CV experience\n"
        "- company_fit_points: array of 3 strings — talking points for cultural/values fit\n"
    )

    result = _groq_json(system, user, max_tokens=3500)
    return result if isinstance(result, dict) else {}


def evaluate_answer(
    question: str,
    answer: str,
    expected_skills: List[str],
    language: str = "en",
    seniority: str = "mid",
) -> Dict[str, Any]:
    """Score a candidate's typed answer 0-100 and give coaching feedback."""
    lang_note = "Respond in French." if language == "fr" else "Respond in English."

    seniority_bar = {
        "junior": "Be encouraging. Score 60+ for decent answers showing basic understanding.",
        "mid": "Be balanced. Expect concrete examples and some depth. Score 70+ for solid answers.",
        "senior": "Be strict. Expect depth, trade-offs, and specific technical details. Score 70+ only for truly strong answers.",
        "lead": "Be very strict. Expect leadership context, architectural thinking, and measurable impact.",
        "principal": "Be extremely strict. Only exceptional answers with system-wide thinking and strategic insight score above 75.",
    }.get(seniority, "Be balanced.")

    system = (
        "You are a strict but fair interview evaluator at a top-tier tech company. "
        + lang_note + " " + seniority_bar + " Return ONLY valid JSON."
    )
    user = (
        f"QUESTION: {question}\n"
        f"EXPECTED SKILLS: {', '.join(expected_skills) if expected_skills else 'Infer from question'}\n"
        f"CANDIDATE ANSWER: {answer[:2000]}\n\n"
        "Evaluate and return JSON with these exact keys:\n"
        "- score: int 0-100\n"
        "- feedback: string (2-3 sentences of specific, actionable coaching advice mentioning what was missing or excellent)\n"
        "- what_worked: array of 2-4 strings (specific strengths of this answer)\n"
        "- what_to_improve: array of 2-4 strings (specific, actionable improvements)\n"
    )
    result = _groq_json(system, user, max_tokens=800)
    return result if isinstance(result, dict) else {"score": 0, "feedback": "Unable to evaluate.", "what_worked": [], "what_to_improve": []}
