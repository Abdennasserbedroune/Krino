"""Interview prep generation service."""
from __future__ import annotations
import json
from typing import Any, Dict, List

from groq import Groq
from app.core.config import settings


def _groq_json(system: str, user: str) -> Any:
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
            max_tokens=2000,
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
) -> Dict[str, Any]:
    """Generate a full interview prep pack from CV + JD.

    Returns
    -------
    {
      questions:    [{id, type, question}],   # 5 behavioural + 5 technical
      weak_points:  [str],
      star_stories: [{situation, task, action, result, skill}],
      company_fit:  [str],
    }
    """
    lang_note = "Respond entirely in French." if language == "fr" else "Respond in English."
    system = (
        "You are a senior interview coach. " + lang_note +
        " Return ONLY valid JSON."
    )
    user = (
        f"JOB TITLE: {job_title}\n"
        f"JOB REQUIREMENTS:\n{json.dumps(jd_parsed, indent=2)[:1500]}\n\n"
        f"CANDIDATE CV:\n{json.dumps(cv_structured, indent=2)[:2000]}\n\n"
        "Generate an interview prep pack. Return JSON with keys:\n"
        "- questions: array of 10 objects {id(int), type(behavioural|technical|situational), question(string)}\n"
        "- weak_points: array of 3 strings — areas the candidate should prepare for\n"
        "- star_stories: array of 3 objects {situation, task, action, result, skill} based on real CV experience\n"
        "- company_fit_points: array of 3 strings — talking points for cultural fit\n"
    )
    result = _groq_json(system, user)
    return result if isinstance(result, dict) else {}


def evaluate_answer(
    question: str,
    answer: str,
    expected_skills: List[str],
    language: str = "en",
) -> Dict[str, Any]:
    """Score a candidate's typed answer 0-100 and give coaching feedback."""
    lang_note = "Respond in French." if language == "fr" else "Respond in English."
    system = "You are a strict but fair interview evaluator. " + lang_note + " Return ONLY valid JSON."
    user = (
        f"QUESTION: {question}\n"
        f"EXPECTED SKILLS: {', '.join(expected_skills)}\n"
        f"CANDIDATE ANSWER: {answer[:1500]}\n\n"
        "Evaluate and return JSON with keys:\n"
        "- score: int 0-100\n"
        "- feedback: string (2-3 sentences of coaching advice)\n"
        "- what_worked: array of strings\n"
        "- what_to_improve: array of strings\n"
    )
    result = _groq_json(system, user)
    return result if isinstance(result, dict) else {"score": 0, "feedback": "Unable to evaluate."}
