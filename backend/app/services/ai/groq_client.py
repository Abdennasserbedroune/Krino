"""Groq client utilities for CV analysis and rewriting.

Provides functions to interact with Groq API for reviewing CVs and generating improved versions.
"""
import json
from typing import Any, Dict, List, Optional
from groq import Groq
from app.core.config import settings

def get_groq_client() -> Groq:
    """Create a Groq client using the configured API key."""
    return Groq(api_key=settings.GROQ_API_KEY)

def review_cv_with_groq(
    extracted_cv: Dict[str, Any],
    structured_data: Dict[str, Any],
    analysis_result: Dict[str, Any]
) -> Dict[str, Any]:
    """Review CV using Groq based on extracted CV data and analysis."""
    client = get_groq_client()
    
    raw_text = extracted_cv.get('raw_text', '')
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
    )
    
    user_prompt = (
        f"=== CV CONTENT ===\n{raw_text}\n\n"
        f"=== ANALYSIS METRICS ===\n"
        f"Score: {analysis_result.get('score', 'N/A')}/100\n"
        f"Readability: {analysis_result.get('readability_score', 'N/A')}\n"
        f"Grade Level: {analysis_result.get('grade_level', 'N/A')}\n\n"
        "Based on this CV, provide comprehensive feedback:\n"
        "1. **key_weaknesses**: List 3-5 specific weaknesses\n"
        "2. **improvements**: List 3-5 actionable improvements\n"
        "3. **missing_elements**: What's missing that would strengthen this CV\n"
        "4. **section_changes**: Specific changes for each section\n\n"
        "Return a JSON object with these exact keys: 'key_weaknesses', 'improvements', 'missing_elements', 'section_changes'"
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
            "section_changes": []
        }

def rewrite_cv_with_groq(
    structured_data: Dict[str, Any],
    suggestions: Dict[str, Any]
) -> str:
    """Rewrite CV based on structured data and suggestions."""
    client = get_groq_client()
    
    system_prompt = (
        "Rewrite the user's CV using professional language, correct structure, "
        "modern formatting, and clear bullet points.\n"
        "Keep all factual experience. Do not invent anything."
    )
    
    user_prompt = (
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


def match_cv_to_job_with_groq(job_summary: str, cv_summary: str) -> Dict[str, Any]:
    """Ask Groq to explain how well a CV matches a job profile (recruiter flow).

    Returns a JSON-like dict with keys: overall_reason, strengths, risks.
    """
    client = get_groq_client()

    system_prompt = (
        "You are an expert technical recruiter.\n"
        "Compare one job profile with one candidate CV and explain the fit.\n"
        "Always be honest if the CV does NOT match the job (wrong domain or too little experience)."
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


# ─── SEEKER MATCH PIPELINE ────────────────────────────────────────────────────
#
# Two-step approach for the "Desired Job" seeker flow:
#   Step 1 — extract_job_requirements  : reads only the job description (~300 tokens)
#   Step 2 — analyze_cv_against_job    : reads step-1 output + cv structured JSON (~600 tokens)
#
# Total budget per match: ~900 tokens vs ~4 000 for the naive single-call approach.
# The split also keeps each call focused, which dramatically improves output quality.

def extract_job_requirements(
    job_description: str,
    job_category: str = "",
    job_title: str = "",
    skills_hint: str = "",
) -> Dict[str, Any]:
    """Step 1 — Parse a raw job description into a structured requirements dict.

    The model only receives the job text here — no CV involved yet.
    Input is capped at 3 000 characters to stay well within token limits while
    still being generous enough to cover even the longest job postings.

    Returns a dict with keys:
        required_skills      : list[str]  — hard requirements
        nice_to_have         : list[str]  — preferred but not blocking
        seniority_level      : str        — e.g. "Senior", "Mid", "Entry"
        key_responsibilities : list[str]  — what the role actually involves
        experience_years     : str        — e.g. "3-5 years" or "5+" or ""
        domain               : str        — normalised domain label
    """
    client = get_groq_client()

    # Cap the description to avoid blowing the context window
    description_snippet = (job_description or "").strip()[:3000]

    category_hint = f"Job category: {job_category}\n" if job_category else ""
    title_hint = f"Job title: {job_title}\n" if job_title else ""
    skills_context = f"Skills mentioned by the applicant as relevant: {skills_hint}\n" if skills_hint else ""

    system_prompt = (
        "You are a precise job requirements extractor.\n"
        "Read the job description below and return a structured JSON summary of what this role requires.\n"
        "Be specific — pull exact tools, technologies, and experience levels from the text.\n"
        "Do NOT invent requirements that are not stated or strongly implied in the description."
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
        "- domain: string — the primary professional domain (e.g. 'Software Engineering', 'AI & Data', 'Finance')\n"
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
        # Graceful fallback — return what we know from the form fields
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
) -> Dict[str, Any]:
    """Step 2 — Deep analysis of a CV against already-extracted job requirements.

    Receives the clean structured output from Step 1 plus the CV's structured_data
    (already stored in the DB as a tidy JSON — not raw text).  This keeps the
    prompt small while giving the model everything it needs to reason precisely.

    Returns a dict with keys:
        overall_verdict      : str   — 1-sentence honest verdict
        hire_probability     : str   — e.g. "~65% chance of passing CV screening"
        overall_reason       : str   — 2-3 sentences of detailed explanation
        strengths            : list[str]  — specific matching points (reference actual CV content)
        gaps                 : list[str]  — specific missing items with severity label
        actionable_advice    : list[str]  — concrete steps to improve chances before applying
        application_ready    : bool  — true if candidate should apply now, false if they should fix gaps first
    """
    client = get_groq_client()

    title_line = f"Job title: {job_title}\n" if job_title else ""

    # Compact representations — we only send what the model needs
    requirements_json = json.dumps(job_requirements, indent=2)

    # Strip heavy/noisy fields from structured CV before sending
    cv_compact = {
        k: v for k, v in (cv_structured or {}).items()
        if k in ("personal_info", "summary", "experience", "education", "skills", "certifications", "languages")
    }
    cv_json = json.dumps(cv_compact, indent=2)[:2500]  # hard cap

    cv_score = cv_analysis.get("score", "N/A")
    cv_readability = cv_analysis.get("readability_score", "N/A")

    system_prompt = (
        "You are a brutally honest but constructive career advisor.\n"
        "Your job is to tell a job seeker exactly how well their CV matches a specific role.\n"
        "Rules:\n"
        "- Reference SPECIFIC skills, tools, and experience from the CV — never speak in generalities\n"
        "- For each gap, state HOW critical it is: [BLOCKING], [IMPORTANT], or [MINOR]\n"
        "- Actionable advice must be concrete: name the exact skill to add, the cert to get, or the section to rewrite\n"
        "- Be honest about weak matches — false hope hurts the user\n"
        "- The hire_probability must be a realistic percentage range based on the actual gaps found"
    )

    user_prompt = (
        f"{title_line}"
        f"=== ROLE REQUIREMENTS (extracted from job description) ===\n{requirements_json}\n\n"
        f"=== CANDIDATE CV (structured) ===\n{cv_json}\n\n"
        f"CV quality score: {cv_score}/100 | Readability: {cv_readability}\n\n"
        "Analyse the match and return a JSON object with exactly these keys:\n"
        "- overall_verdict: string — one honest sentence summarising fit (e.g. 'Strong match for a mid-level role but missing cloud experience')\n"
        "- hire_probability: string — realistic % range (e.g. '60-70% chance of passing initial CV screening')\n"
        "- overall_reason: string — 2-3 sentences explaining the score in plain English\n"
        "- strengths: array of strings — each must reference a specific CV element (e.g. '3 years Python ML at [Company] directly maps to their core stack')\n"
        "- gaps: array of strings — each must include severity label [BLOCKING/IMPORTANT/MINOR] and be specific (e.g. '[BLOCKING] No Spark/Databricks — listed as required; only Pandas/SQL found')\n"
        "- actionable_advice: array of strings — concrete next steps (e.g. 'Complete the free Databricks Fundamentals cert (4h) to address the Spark gap before applying')\n"
        "- application_ready: boolean — true if they should apply now, false if critical gaps need addressing first\n"
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


def recruiter_chat(cv_summary: str, messages: List[Dict[str, str]]) -> str:
    """Generate a recruiter-like reply using Groq."""
    client = get_groq_client()
    
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
        return "Sorry, I couldn't process your request at the moment."
