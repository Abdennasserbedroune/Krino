"""Interview prep generation service."""
from __future__ import annotations
import json
import re
from typing import Any, Dict, List

from groq import Groq
from app.core.config import settings

# Use a large, capable model for interview prep so JSON doesn't get truncated.
# llama-3.1-8b-instant is too small for 10-question JSON packs.
INTERVIEW_MODEL  = "llama-3.3-70b-versatile"   # best Groq model supporting json_object
EVALUATE_MODEL   = "llama-3.3-70b-versatile"   # same for evaluation


def _extract_json(text: str) -> Any:
    """Robust JSON extractor — handles models that wrap JSON in markdown code fences."""
    # Strip markdown fences if present
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first { ... } block
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {}


def _groq_json(system: str, user: str, max_tokens: int = 3500, model: str = INTERVIEW_MODEL) -> Any:
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
        )
        raw = resp.choices[0].message.content.strip()
        result = _extract_json(raw)
        if not result:
            print(f"[interview_service] Empty/invalid JSON from model. Raw: {raw[:300]}")
        return result
    except Exception as exc:
        print(f"[interview_service] Groq call failed ({model}): {exc}")
        # Fallback: retry with smaller instant model
        if model != settings.GROQ_MODEL:
            try:
                client2 = Groq(api_key=settings.GROQ_API_KEY)
                resp2 = client2.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                    temperature=0.5,
                    max_tokens=min(max_tokens, 2000),
                )
                return _extract_json(resp2.choices[0].message.content.strip())
            except Exception as exc2:
                print(f"[interview_service] Fallback model also failed: {exc2}")
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
    lang_note = "Respond entirely in French." if language == "fr" else "Respond in English."

    seniority_map = {
        "junior":    "Entry-level (0-2 years). Ask foundational questions.",
        "mid":       "Mid-level (2-5 years). Mix conceptual and practical depth.",
        "senior":    "Senior (5-8 years). Deep system design and trade-off reasoning.",
        "lead":      "Tech Lead (8-12 years). Architecture, leadership, cross-team decisions.",
        "principal": "Principal/Staff (12+ years). Staff engineer level: org-wide impact, platform design, technical strategy.",
    }
    seniority_instruction = seniority_map.get(seniority, seniority_map["mid"])

    company_context = ""
    if company_name:
        company_context = (
            f"\nCOMPANY: {company_name}. "
            "If this is a well-known company, tailor questions to reflect that company's known tech stack, engineering culture, scale, and interview style. "
            "Meta: distributed systems, feed algorithms, React. Amazon: leadership principles, AWS, distributed services. "
            "Google: algorithms, large-scale infra. Capgemini/consulting: cloud migration, client delivery, architecture."
        )

    jd_section = f"\nJOB DESCRIPTION:\n{jd_text[:2000]}" if jd_text else (
        f"\nJOB REQUIREMENTS (parsed):\n{json.dumps(jd_parsed, indent=2)[:1500]}" if jd_parsed else ""
    )
    cv_section = f"\nCANDIDATE CV:\n{json.dumps(cv_structured, indent=2)[:2000]}" if cv_structured else ""

    system = (
        "You are a world-class senior interview coach who has conducted thousands of technical interviews at top-tier companies. "
        + lang_note + " Return ONLY valid JSON with no markdown fences, no explanation."
    )
    user = (
        f"JOB TITLE: {job_title}"
        f"{company_context}"
        f"\nSENIORITY: {seniority_instruction}"
        f"{jd_section}"
        f"{cv_section}\n\n"
        "Return JSON with exactly these keys:\n"
        '- questions: array of EXACTLY 10 objects {"id": int, "type": "technical"|"behavioural"|"situational", "question": string}. '
        "At least 6 must be technical. Make them progressively harder. Senior+ must include system design questions. Questions must be specific to role and company.\n"
        "- weak_points: array of 3 strings (skill gaps based on JD vs CV)\n"
        "- star_stories: array of 3 objects {situation, task, action, result, skill}\n"
        "- company_fit_points: array of 3 strings\n"
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
    lang_note = "Respond in French." if language == "fr" else "Respond in English."
    seniority_bar = {
        "junior": "Be encouraging. Score 60+ for decent answers showing basic understanding.",
        "mid": "Be balanced. Expect concrete examples and some depth.",
        "senior": "Be strict. Expect depth, trade-offs, and specific technical details.",
        "lead": "Be very strict. Expect leadership context, architectural thinking, and measurable impact.",
        "principal": "Be extremely strict. Only exceptional answers with system-wide thinking score above 75.",
    }.get(seniority, "Be balanced.")

    system = "You are a strict but fair interview evaluator at a top-tier tech company. " + lang_note + " " + seniority_bar + " Return ONLY valid JSON."
    user = (
        f"QUESTION: {question}\n"
        f"EXPECTED SKILLS: {', '.join(expected_skills) if expected_skills else 'Infer from question'}\n"
        f"CANDIDATE ANSWER: {answer[:2000]}\n\n"
        "Return JSON with exactly these keys:\n"
        "- score: int 0-100\n"
        "- feedback: string (2-3 sentences of specific coaching advice)\n"
        "- what_worked: array of 2-4 strings\n"
        "- what_to_improve: array of 2-4 strings\n"
    )
    result = _groq_json(system, user, max_tokens=800, model=EVALUATE_MODEL)
    return result if isinstance(result, dict) else {"score": 0, "feedback": "Unable to evaluate.", "what_worked": [], "what_to_improve": []}
