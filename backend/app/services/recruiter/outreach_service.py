"""Recruiter outreach message generation service."""
from __future__ import annotations
import json
from typing import Any, Dict

from groq import Groq
from app.core.config import settings

MESSAGE_TYPES = {
    "intro":      "an initial outreach / cold introduction",
    "interview":  "an interview invitation",
    "followup":   "a follow-up after no response (friendly, not pushy)",
    "rejection":  "a respectful rejection with encouragement",
    "offer":      "an offer-stage message congratulating and next steps",
}


def generate_outreach(
    message_type: str,
    candidate_name: str,
    candidate_strengths: list,
    job_title: str,
    company_name: str = "",
    recruiter_name: str = "",
    language: str = "en",
) -> Dict[str, Any]:
    """Generate a personalised recruiter outreach message.

    Returns {subject, body, personalization_signals}.
    """
    lang_note = "Respond in French." if language == "fr" else "Respond in English."
    msg_desc = MESSAGE_TYPES.get(message_type, "a professional message")
    strengths_str = "\n".join(f"- {s}" for s in (candidate_strengths or [])[:5])
    company_line  = f"Company: {company_name}" if company_name else ""
    recruiter_line = f"Recruiter: {recruiter_name}" if recruiter_name else ""

    client = Groq(api_key=settings.GROQ_API_KEY)
    system = (
        f"You are an expert recruiter writing {msg_desc}. "
        f"{lang_note} "
        "Be warm, professional, and specific. Reference the candidate's actual strengths. "
        "Return ONLY valid JSON."
    )
    user = (
        f"Candidate: {candidate_name}\n"
        f"Role: {job_title}\n"
        f"{company_line}\n{recruiter_line}\n"
        f"Candidate strengths to reference:\n{strengths_str}\n\n"
        "Return JSON with keys:\n"
        "- subject: string (email subject line)\n"
        "- body: string (full message body, plain text, 3-4 paragraphs)\n"
        "- personalization_signals: array of strings (which strengths were referenced)\n"
    )
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
            max_tokens=1000,
        )
        result = json.loads(resp.choices[0].message.content.strip())
        return result if isinstance(result, dict) else {}
    except Exception as exc:
        print(f"[outreach_service] Groq failed: {exc}")
        return {"subject": "", "body": "", "personalization_signals": []}
