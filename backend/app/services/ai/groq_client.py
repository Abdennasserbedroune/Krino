"""Groq client utilities for CV analysis and rewriting.

All public functions accept an optional `language` parameter ('en' | 'fr').
When set to 'fr', every AI response — including JSON values — is produced
entirely in French.
"""
import json
from typing import Any, Dict, List, Optional
from groq import Groq
from app.core.config import settings
from app.services.ai.language_utils import get_language_directive


def get_groq_client() -> Groq:
    """Create a Groq client using the configured API key."""
    return Groq(api_key=settings.GROQ_API_KEY)


def review_cv_with_groq(
    extracted_cv: Dict[str, Any],
    structured_data: Dict[str, Any],
    analysis_result: Dict[str, Any],
    language: str = "fr",
) -> Dict[str, Any]:
    """Review CV using Groq based on extracted CV data and analysis."""
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    raw_text = extracted_cv.get("raw_text", "")
    if not raw_text:
        raw_text = json.dumps(extracted_cv, indent=2)

    system_prompt = (
        "You are a senior CV reviewer and career advisor with expertise across all industries.\n"
        "Your job is to review the candidate's CV and provide specific, actionable feedback.\n"
        "Rules:\n"
        "- Base ALL suggestions on the actual CV content provided\n"
        "- Be specific: reference actual companies, roles, skills mentioned in the CV\n"
        "- Identify missing elements that would strengthen the CV for their field\n"
        "- Suggest improvements to formatting, wording, and structure\n"
        "- Point out weak sections that need more detail or better presentation\n"
        "- Do NOT hallucinate experience or skills not present in the CV\n"
        "- Make recommendations tailored to the candidate's industry/field"
        + lang_directive
    )

    lang_note = (
        "\nRéponds entièrement en français. Les valeurs JSON doivent aussi être en français.\n"
        if language == "fr"
        else ""
    )

    user_prompt = (
        f"=== CV CONTENT ===\n{raw_text}\n\n"
        f"=== ANALYSIS METRICS ===\n"
        f"Score: {analysis_result.get('score', 'N/A')}/100\n"
        f"Readability: {analysis_result.get('readability_score', 'N/A')}\n"
        f"Grade Level: {analysis_result.get('grade_level', 'N/A')}\n\n"
        f"{lang_note}"
        "Based on this CV, provide comprehensive feedback:\n"
        "1. **key_weaknesses**: List 3-5 specific weaknesses\n"
        "2. **improvements**: List 3-5 actionable improvements\n"
        "3. **missing_elements**: What's missing that would strengthen this CV\n"
        "4. **section_changes**: Specific changes for each section\n\n"
        "Return a JSON object with these exact keys: "
        "'key_weaknesses', 'improvements', 'missing_elements', 'section_changes'"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=4000,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"Groq review failed: {e}")
        return {
            "error": f"Groq review failed: {str(e)}",
            "key_weaknesses": [],
            "improvements": [],
            "missing_elements": [],
            "section_changes": [],
        }


def rewrite_cv_with_groq(
    structured_data: Dict[str, Any],
    suggestions: Dict[str, Any],
    language: str = "fr",
) -> str:
    """Rewrite CV based on structured data and suggestions."""
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    lang_note = (
        "Réécris le CV entièrement en français.\n"
        if language == "fr"
        else "Rewrite the CV in English.\n"
    )

    system_prompt = (
        "Rewrite the user's CV using professional language, correct structure, "
        "modern formatting, and clear bullet points.\n"
        "Keep all factual experience. Do not invent anything."
        + lang_directive
    )

    user_prompt = (
        f"{lang_note}"
        f"Rewrite my CV based on this structured data:\n{json.dumps(structured_data, indent=2)}\n\n"
        f"And apply the following improvements:\n{json.dumps(suggestions, indent=2)}\n\n"
        "Return a clean, ready-to-export CV in Markdown format."
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq rewrite failed: {e}")
        return f"Error generating CV: {str(e)}"


def match_cv_to_job_with_groq(
    job_summary: str,
    cv_summary: str,
    language: str = "fr",
) -> Dict[str, Any]:
    """Ask Groq to explain how well a CV matches a job profile (recruiter flow)."""
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    system_prompt = (
        "You are an expert technical recruiter.\n"
        "Compare one job profile with one candidate CV and explain the fit.\n"
        "Always be honest if the CV does NOT match the job (wrong domain or too little experience)."
        + lang_directive
    )

    user_prompt = (
        "=== JOB PROFILE ===\n" f"{job_summary}\n\n"
        "=== CANDIDATE CV (TEXT SUMMARY) ===\n" f"{cv_summary}\n\n"
        "Return a JSON object with exactly these keys:\n"
        "overall_reason: short paragraph (2-3 sentences) summarising fit or mismatch.\n"
        "strengths: list of bullet strings describing why the profile fits.\n"
        "risks: list of bullet strings describing gaps or reasons it may not fit.\n"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"Groq match_cv_to_job failed: {e}")
        return {
            "overall_reason": "Unable to generate AI explanation for this CV.",
            "strengths": [],
            "risks": [f"Groq error: {e}"],
        }


# ── SEEKER MATCH PIPELINE ─────────────────────────────────────────────────────

def extract_job_requirements(
    job_description: str,
    job_category: str = "",
    job_title: str = "",
    skills_hint: str = "",
    language: str = "fr",
) -> Dict[str, Any]:
    """Step 1 — Parse a raw job description into a structured requirements dict."""
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    description_snippet = (job_description or "").strip()[:3000]
    category_hint = f"Job category: {job_category}\n" if job_category else ""
    title_hint = f"Job title: {job_title}\n" if job_title else ""
    skills_context = f"Skills mentioned by the applicant as relevant: {skills_hint}\n" if skills_hint else ""

    system_prompt = (
        "You are a precise job requirements extractor.\n"
        "Read the job description below and return a structured JSON summary of what this role requires.\n"
        "Be specific — pull exact tools, technologies, and experience levels from the text.\n"
        "Do NOT invent requirements that are not stated or strongly implied in the description."
        + lang_directive
    )

    user_prompt = (
        f"{category_hint}{title_hint}{skills_context}"
        f"=== JOB DESCRIPTION ===\n{description_snippet}\n\n"
        "Return a JSON object with exactly these keys:\n"
        "- required_skills: array of strings — hard-required tools/technologies/competencies\n"
        "- nice_to_have: array of strings — preferred but not blocking\n"
        "- seniority_level: string — one of: Entry, Junior, Mid, Senior, Lead, Executive\n"
        "- key_responsibilities: array of strings — what the person will actually do (max 5)\n"
        "- experience_years: string — e.g. '3-5 years' or '5+' or '' if not stated\n"
        "- domain: string — the primary professional domain\n"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"extract_job_requirements failed: {e}")
        return {
            "required_skills": [s.strip() for s in skills_hint.split(",") if s.strip()],
            "nice_to_have": [],
            "seniority_level": "",
            "key_responsibilities": [],
            "experience_years": "",
            "domain": job_category,
            "_fallback": True,
        }


def analyze_cv_against_job(
    job_requirements: Dict[str, Any],
    cv_structured: Dict[str, Any],
    cv_analysis: Dict[str, Any],
    job_title: str = "",
    language: str = "fr",
    candidate_years: int = 0,
) -> Dict[str, Any]:
    """Step 2 — Deep analysis of a CV against already-extracted job requirements.

    candidate_years is the canonical value computed from experience dates at
    upload time — passed explicitly so the model never has to re-infer it.
    """
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    title_line = f"Job title: {job_title}\n" if job_title else ""
    requirements_json = json.dumps(job_requirements, indent=2)

    cv_compact = {
        k: v for k, v in (cv_structured or {}).items()
        if k in ("personal_info", "summary", "experience", "education", "skills", "certifications", "languages")
    }
    cv_json = json.dumps(cv_compact, indent=2)[:2500]

    cv_score = cv_analysis.get("score", "N/A")
    cv_readability = cv_analysis.get("readability_score", "N/A")

    # Inject canonical years so the model never guesses
    years_line = (
        f"Candidate total years of experience (computed from CV dates): {candidate_years} years.\n"
        if candidate_years > 0
        else ""
    )

    system_prompt = (
        "You are a brutally honest but constructive career advisor.\n"
        "Your job is to tell a job seeker exactly how well their CV matches a specific role.\n"
        "Rules:\n"
        "- Reference SPECIFIC skills, tools, and experience from the CV — never speak in generalities\n"
        "- For each gap, state HOW critical it is: [BLOCKING], [IMPORTANT], or [MINOR]\n"
        "- Actionable advice must be concrete: name the exact skill to add, the cert to get, or the section to rewrite\n"
        "- Be honest about weak matches — false hope hurts the user\n"
        "- The hire_probability must be a realistic percentage range based on the actual gaps found\n"
        "- IMPORTANT: use the provided candidate_years value as the authoritative years of experience — do NOT re-derive it from the CV text"
        + lang_directive
    )

    user_prompt = (
        f"{title_line}"
        f"{years_line}"
        f"=== ROLE REQUIREMENTS (extracted from job description) ===\n{requirements_json}\n\n"
        f"=== CANDIDATE CV (structured) ===\n{cv_json}\n\n"
        f"CV quality score: {cv_score}/100 | Readability: {cv_readability}\n\n"
        "Analyse the match and return a JSON object with exactly these keys:\n"
        "- overall_verdict: string — one honest sentence summarising fit\n"
        "- hire_probability: string — realistic % range\n"
        "- overall_reason: string — 2-3 sentences explaining the score in plain language\n"
        "- strengths: array of strings — each must reference a specific CV element\n"
        "- gaps: array of strings — each must include severity label [BLOCKING/IMPORTANT/MINOR]\n"
        "- actionable_advice: array of strings — concrete next steps\n"
        "- application_ready: boolean — true if they should apply now\n"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"analyze_cv_against_job failed: {e}")
        return {
            "overall_verdict": "Analysis unavailable — please try again.",
            "hire_probability": "N/A",
            "overall_reason": f"The AI analysis could not be completed: {str(e)}",
            "strengths": [],
            "gaps": [],
            "actionable_advice": ["Try again in a few seconds — the AI service may be temporarily busy."],
            "application_ready": False,
        }


def recruiter_chat(
    cv_summary: str,
    messages: List[Dict[str, str]],
    language: str = "fr",
) -> str:
    """Generate a recruiter-like reply using Groq."""
    client = get_groq_client()
    lang_directive = get_language_directive(language)

    history = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in messages])

    system_prompt = (
        "You are an expert career advisor and CV consultant with deep knowledge across all industries. "
        "Your role is to provide personalized, actionable feedback based on the user's actual CV data.\n\n"
        "Guidelines:\n"
        "1. Use the CV information provided to give specific advice about their skills, experience, and career field\n"
        "2. Ask insightful questions about their career goals, target roles, and industry preferences\n"
        "3. Provide constructive criticism on weak sections or missing elements in their CV\n"
        "4. Suggest improvements tailored to their field (e.g., tech, marketing, finance, etc.)\n"
        "5. Be encouraging but honest - point out both strengths and areas for improvement\n"
        "6. Reference specific details from their CV (skills, company names, education) to show you understand their background\n"
        "7. Keep responses concise and conversational (2-4 sentences unless asked for detailed advice)\n\n"
        "Remember: Base ALL your advice on the actual CV data provided."
        + lang_directive
    )

    user_prompt = (
        f"=== USER'S CV INFORMATION ===\n{cv_summary}\n\n"
        f"=== CONVERSATION HISTORY ===\n{history}\n\n"
        "Based on the CV information above and the conversation history, provide a helpful, "
        "specific response to the user's latest message. Reference their actual skills, "
        "experience, or education when relevant."
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        reply = response.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.strip("`")
        return reply
    except Exception as e:
        print(f"Groq recruiter_chat failed: {e}")
        return "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer."
