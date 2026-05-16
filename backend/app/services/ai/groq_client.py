"""Groq client utilities for CV analysis and rewriting."""
import json
import logging
from typing import Any, Dict, List

from groq import Groq

from app.core.config import settings
from app.services.ai.language_utils import get_language_directive

logger = logging.getLogger(__name__)


def get_groq_client() -> Groq:
    return Groq(api_key=settings.GROQ_API_KEY)


def review_cv_with_groq(
    extracted_cv: Dict[str, Any],
    structured_data: Dict[str, Any],
    analysis_result: Dict[str, Any],
    language: str = "fr",
) -> Dict[str, Any]:
    client = get_groq_client()
    lang_directive = get_language_directive(language)
    raw_text = extracted_cv.get("raw_text", "") or json.dumps(extracted_cv, indent=2)
    lang_note = "\nRéponds entièrement en français. Les valeurs JSON doivent aussi être en français.\n" if language == "fr" else ""

    system_prompt = (
        "You are a senior CV reviewer. Review the candidate's CV and provide specific, actionable feedback. "
        "Base ALL suggestions on the actual CV content. Do NOT hallucinate experience or skills."
        + lang_directive
    )
    user_prompt = (
        f"=== CV CONTENT ===\n{raw_text}\n\n"
        f"=== ANALYSIS METRICS ===\nScore: {analysis_result.get('score', 'N/A')}/100\n"
        f"Readability: {analysis_result.get('readability_score', 'N/A')}\n\n"
        f"{lang_note}"
        "Return a JSON object with keys: 'key_weaknesses', 'improvements', 'missing_elements', 'section_changes'"
    )
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=4000,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"review_cv_with_groq failed: {e}")
        return {"error": str(e), "key_weaknesses": [], "improvements": [], "missing_elements": [], "section_changes": []}


def rewrite_cv_with_groq(structured_data: Dict[str, Any], suggestions: Dict[str, Any], language: str = "fr") -> str:
    lang_directive = get_language_directive(language)
    lang_note = "Réécris le CV entièrement en français.\n" if language == "fr" else "Rewrite the CV in English.\n"
    system_prompt = "Rewrite the user's CV using professional language and clear bullet points. Keep all factual experience. Do not invent anything." + lang_directive
    user_prompt = (
        f"{lang_note}Rewrite my CV:\n{json.dumps(structured_data, indent=2)}\n\n"
        f"Apply improvements:\n{json.dumps(suggestions, indent=2)}\n\nReturn clean Markdown."
    )
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"rewrite_cv_with_groq failed: {e}")
        return f"Error generating CV: {e}"


def match_cv_to_job_with_groq(job_summary: str, cv_summary: str, language: str = "fr") -> Dict[str, Any]:
    lang_directive = get_language_directive(language)
    system_prompt = "You are an expert technical recruiter. Compare one job profile with one candidate CV and explain the fit. Be honest about mismatches." + lang_directive
    user_prompt = (
        f"=== JOB PROFILE ===\n{job_summary}\n\n=== CANDIDATE CV ===\n{cv_summary}\n\n"
        "Return JSON with keys: overall_reason (str), strengths (list), risks (list)."
    )
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"match_cv_to_job_with_groq failed: {e}")
        return {"overall_reason": "Unable to generate AI explanation.", "strengths": [], "risks": [str(e)]}


def extract_job_requirements(
    job_description: str,
    job_category: str = "",
    job_title: str = "",
    skills_hint: str = "",
    language: str = "fr",
) -> Dict[str, Any]:
    lang_directive = get_language_directive(language)
    description_snippet = (job_description or "").strip()[:3000]
    system_prompt = "You are a precise job requirements extractor. Pull exact tools, technologies, and experience levels from the text. Do NOT invent requirements." + lang_directive
    user_prompt = (
        f"{f'Job category: {job_category}\n' if job_category else ''}"
        f"{f'Job title: {job_title}\n' if job_title else ''}"
        f"{f'Skills hint: {skills_hint}\n' if skills_hint else ''}"
        f"=== JOB DESCRIPTION ===\n{description_snippet}\n\n"
        "Return JSON with keys: required_skills (list), nice_to_have (list), seniority_level (str), "
        "key_responsibilities (list, max 5), experience_years (str), domain (str)."
    )
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"extract_job_requirements failed: {e}")
        return {
            "required_skills": [s.strip() for s in skills_hint.split(",") if s.strip()],
            "nice_to_have": [], "seniority_level": "", "key_responsibilities": [],
            "experience_years": "", "domain": job_category, "_fallback": True,
        }


def analyze_cv_against_job(
    job_requirements: Dict[str, Any],
    cv_structured: Dict[str, Any],
    cv_analysis: Dict[str, Any],
    job_title: str = "",
    language: str = "fr",
    candidate_years: int = 0,
) -> Dict[str, Any]:
    lang_directive = get_language_directive(language)
    cv_compact = {k: v for k, v in (cv_structured or {}).items()
                  if k in ("personal_info", "summary", "experience", "education", "skills", "certifications", "languages")}
    system_prompt = (
        "You are a brutally honest career advisor. Tell a job seeker exactly how well their CV matches a role. "
        "Reference SPECIFIC skills and tools. Label each gap [BLOCKING/IMPORTANT/MINOR]. "
        "Use the provided candidate_years as authoritative — do NOT re-derive from CV text."
        + lang_directive
    )
    user_prompt = (
        f"{f'Job title: {job_title}\n' if job_title else ''}"
        f"{f'Candidate experience: {candidate_years} years.\n' if candidate_years > 0 else ''}"
        f"=== ROLE REQUIREMENTS ===\n{json.dumps(job_requirements, indent=2)}\n\n"
        f"=== CANDIDATE CV ===\n{json.dumps(cv_compact, indent=2)[:2500]}\n\n"
        f"CV quality score: {cv_analysis.get('score', 'N/A')}/100\n\n"
        "Return JSON with keys: overall_verdict (str), hire_probability (str), overall_reason (str), "
        "strengths (list), gaps (list), actionable_advice (list), application_ready (bool)."
    )
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"analyze_cv_against_job failed: {e}")
        return {
            "overall_verdict": "Analysis unavailable — please try again.",
            "hire_probability": "N/A",
            "overall_reason": f"AI analysis could not be completed: {e}",
            "strengths": [], "gaps": [],
            "actionable_advice": ["Try again in a few seconds."],
            "application_ready": False,
        }


def recruiter_chat(cv_summary: str, messages: List[Dict[str, str]], language: str = "fr") -> str:
    lang_directive = get_language_directive(language)
    history = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in messages])
    system_prompt = (
        "You are an expert career advisor. Provide personalized, actionable feedback based on the user's CV. "
        "Reference specific details from their CV. Keep responses concise (2-4 sentences)."
        + lang_directive
    )
    user_prompt = f"=== CV ===\n{cv_summary}\n\n=== CONVERSATION ===\n{history}\n\nRespond to the user's latest message."
    try:
        response = get_groq_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.7,
            max_tokens=1000,
        )
        reply = response.choices[0].message.content.strip()
        return reply.strip("`") if reply.startswith("```") else reply
    except Exception as e:
        logger.error(f"recruiter_chat failed: {e}")
        return "Sorry, I could not process your request. Please try again."
