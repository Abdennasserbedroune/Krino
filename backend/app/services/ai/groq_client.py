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
    """Review CV using Groq based on extracted CV data and analysis.
    
    Args:
        extracted_cv: Dict containing raw_text and metadata (primary source of CV content)
        structured_data: Dict containing parsed sections (may be sparse)
        analysis_result: Dict containing local NLP analysis (score, readability, entities)
        
    Returns:
        Dict containing suggestions and improvements.
    """
    client = get_groq_client()
    
    # Get raw CV text (this has all the actual content)
    raw_text = extracted_cv.get('raw_text', '')
    if not raw_text:
        # Fallback to stringified extracted_cv
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
        "1. **key_weaknesses**: List 3-5 specific weaknesses (e.g., 'Missing quantifiable achievements in work experience')\n"
        "2. **improvements**: List 3-5 actionable improvements (e.g., 'Add metrics to your [specific role] responsibilities')\n"
        "3. **missing_elements**: What's missing that would strengthen this CV (e.g., 'Professional summary', 'Certifications')\n"
        "4. **section_changes**: Specific changes for each section (Education, Experience, Skills, etc.)\n\n"
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
    """Rewrite CV based on structured data and suggestions.
    
    Args:
        structured_data: Dict containing parsed sections
        suggestions: Dict containing AI suggestions
        
    Returns:
        String containing the rewritten CV content (markdown/text).
    """
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
    """Ask Groq to explain how well a CV matches a job profile.

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


def recruiter_chat(cv_summary: str, messages: List[Dict[str, str]]) -> str:
    """Generate a recruiter-like reply using Groq.
    
    Args:
        cv_summary: A comprehensive string with CV data (skills, education, experience, analysis).
        messages: List of message dicts with ``role`` (user/assistant) and ``content``.
    
    Returns:
        The assistant's reply as a plain string.
    """
    client = get_groq_client()
    
    # Build conversation history
    history = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in messages])
    
    # Enhanced system prompt
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
    
    # Build user prompt with CV context
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
