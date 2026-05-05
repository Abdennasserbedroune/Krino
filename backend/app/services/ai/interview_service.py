"""Interview preparation AI service — Groq-powered.

Functions:
  generate_interview_questions  — produce 10 tailored questions for a role
  evaluate_interview_answer     — score and give feedback on a single answer
  generate_followup_question    — produce a dynamic follow-up in live mode
"""
import json
from typing import Any

from app.core.config import settings
from app.services.ai.groq_client import get_groq_client
from app.services.ai.language_utils import get_language_directive


# ─── Difficulty map by experience level ──────────────────────────────────────
_DIFFICULTY_MAP: dict[str, dict[str, int]] = {
    "Junior":       {"Easy": 5, "Medium": 4, "Hard": 1},
    "Mid":          {"Easy": 2, "Medium": 5, "Hard": 3},
    "Senior":       {"Easy": 0, "Medium": 4, "Hard": 6},
    "Lead / Staff": {"Easy": 0, "Medium": 2, "Hard": 8},
}
_DEFAULT_DIFFICULTY = {"Easy": 2, "Medium": 5, "Hard": 3}

_QUESTION_TYPES = [
    "Technical", "Coding", "System Design",
    "Behavioral", "Case Study",
]


def generate_interview_questions(
    job_title: str,
    job_field: str,
    experience_level: str = "Mid",
    company_name: str = "",
    tech_stack: str = "",
    extra_context: str = "",
    language: str = "en",
) -> list[dict[str, Any]]:
    """Generate 10 tailored interview questions.

    Returns a list of dicts:
      id, question, type, difficulty, hint
    """
    client       = get_groq_client()
    lang_dir     = get_language_directive(language)
    difficulty   = _DIFFICULTY_MAP.get(experience_level, _DEFAULT_DIFFICULTY)
    company_line = f"Target company: {company_name}.\n" if company_name else ""
    stack_line   = f"Tech stack / tools: {tech_stack}.\n" if tech_stack else ""
    extra_line   = f"Additional context: {extra_context}.\n" if extra_context else ""

    # Build difficulty instruction
    diff_parts = []
    for label, count in difficulty.items():
        if count > 0:
            diff_parts.append(f"{count} {label}")
    diff_instruction = ", ".join(diff_parts)

    lang_note = (
        "All questions, hints, difficulty labels, and type labels MUST be written in French.\n"
        "Use these exact French labels for difficulty: Facile, Moyen, Difficile.\n"
        "Use these exact French labels for type: Technique, Codage, Conception Système, Comportemental, Étude de cas.\n"
        if language == "fr"
        else ""
    )

    system_prompt = (
        "You are a world-class technical interviewer with 15+ years of hiring experience "
        "across top-tier tech companies.\n"
        "Your questions are specific, realistic, and calibrated to the exact seniority level.\n"
        "You never ask generic questions — every question is rooted in the role, domain, and stack provided.\n"
        "For Coding questions at Senior/Lead level: include a short code snippet or pseudo-code scenario in the question itself.\n"
        "For System Design questions: be specific about scale (e.g., '10M daily users', 'sub-100ms latency').\n"
        "For Behavioral questions: use the STAR framework as the expected answer structure.\n"
        + lang_dir
    )

    user_prompt = (
        f"Generate exactly 10 interview questions for the following role:\n"
        f"Job title: {job_title}\n"
        f"Field / domain: {job_field}\n"
        f"Experience level: {experience_level}\n"
        f"{company_line}{stack_line}{extra_line}\n"
        f"{lang_note}"
        f"Difficulty distribution: {diff_instruction} (must total exactly 10).\n\n"
        f"Question types to use (distribute naturally): {', '.join(_QUESTION_TYPES)}\n\n"
        "Return a JSON object with a single key 'questions' containing an array of exactly 10 objects.\n"
        "Each object must have exactly these keys:\n"
        "  id: integer (1-10)\n"
        "  question: string — the full question text\n"
        "  type: string — one of the type labels above\n"
        "  difficulty: string — one of the difficulty labels above\n"
        "  hint: string — a 1-sentence hint on what a strong answer should cover\n"
        "No extra keys. No markdown. Pure JSON only."
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.6,
            response_format={"type": "json_object"},
            max_tokens=3500,
        )
        content = response.choices[0].message.content.strip()
        data    = json.loads(content)
        return data.get("questions", [])
    except Exception as e:
        print(f"[interview_service] generate_interview_questions failed: {e}")
        return []


def evaluate_interview_answer(
    question: str,
    answer: str,
    job_title: str,
    question_type: str = "Technical",
    language: str = "en",
) -> dict[str, Any]:
    """Evaluate a single answer to an interview question.

    Returns a dict:
      score (0-100), verdict, what_was_good,
      what_was_missing, ideal_answer_summary
    """
    client   = get_groq_client()
    lang_dir = get_language_directive(language)

    lang_note = (
        "Réponds entièrement en français. Les valeurs JSON doivent aussi être en français.\n"
        if language == "fr"
        else ""
    )

    system_prompt = (
        "You are a senior technical interviewer evaluating a candidate's answer.\n"
        "Be honest, fair, and specific — reference actual content from the answer.\n"
        "Scoring guide:\n"
        "  90-100: Exceptional — covers all key aspects, gives concrete examples, adds depth\n"
        "  70-89:  Strong — covers main points, minor gaps only\n"
        "  50-69:  Acceptable — correct direction but shallow or missing key elements\n"
        "  30-49:  Weak — partial understanding, significant gaps\n"
        "  0-29:   Inadequate — wrong direction or too vague to assess\n"
        "Never inflate scores — a truly weak answer must score low.\n"
        + lang_dir
    )

    user_prompt = (
        f"{lang_note}"
        f"Role being interviewed for: {job_title}\n"
        f"Question type: {question_type}\n\n"
        f"=== QUESTION ===\n{question}\n\n"
        f"=== CANDIDATE'S ANSWER ===\n{answer}\n\n"
        "Evaluate this answer and return a JSON object with exactly these keys:\n"
        "  score: integer 0-100\n"
        "  verdict: string — one punchy sentence verdict (e.g. 'Strong answer with clear examples')\n"
        "  what_was_good: string — specific positive elements from the actual answer\n"
        "  what_was_missing: string — what a perfect answer would have added\n"
        "  ideal_answer_summary: string — 2-3 sentences describing what the ideal answer looks like\n"
        "No extra keys. No markdown. Pure JSON only."
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"[interview_service] evaluate_interview_answer failed: {e}")
        return {
            "score": 0,
            "verdict": "Evaluation failed — please try again.",
            "what_was_good": "",
            "what_was_missing": "",
            "ideal_answer_summary": f"Error: {str(e)}",
        }


def generate_followup_question(
    job_title: str,
    job_field: str,
    conversation_history: list[dict[str, str]],
    last_answer: str,
    last_question: str,
    language: str = "en",
) -> dict[str, str]:
    """Generate a dynamic conversational follow-up for live interview mode.

    Returns: { question, type, hint }
    """
    client   = get_groq_client()
    lang_dir = get_language_directive(language)

    lang_note = (
        "La question de suivi doit être entièrement en français.\n"
        if language == "fr"
        else ""
    )

    history_text = ""
    for turn in conversation_history[-6:]:  # last 3 exchanges max
        role = "Interviewer" if turn["role"] == "assistant" else "Candidate"
        history_text += f"{role}: {turn['content']}\n"

    system_prompt = (
        "You are conducting a real-time voice interview as a senior technical interviewer.\n"
        "Your follow-up questions must:\n"
        "  1. React specifically to what the candidate just said — probe deeper or challenge a claim\n"
        "  2. Feel natural and conversational, not scripted\n"
        "  3. Stay relevant to the role and domain\n"
        "  4. Never repeat a question already asked\n"
        "Keep the question concise — max 2 sentences. This is voice, not text.\n"
        + lang_dir
    )

    user_prompt = (
        f"{lang_note}"
        f"Role: {job_title} | Field: {job_field}\n\n"
        f"=== CONVERSATION SO FAR ===\n{history_text}\n"
        f"=== LAST QUESTION ASKED ===\n{last_question}\n\n"
        f"=== CANDIDATE'S LAST ANSWER ===\n{last_answer}\n\n"
        "Generate the next follow-up question. Return JSON with exactly:\n"
        "  question: string — the follow-up question\n"
        "  type: string — question type (Technical/Behavioral/Coding/System Design/Case Study)\n"
        "  hint: string — 1-sentence hint for what a strong answer covers\n"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
            max_tokens=300,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"[interview_service] generate_followup_question failed: {e}")
        return {
            "question": "Can you elaborate on that point further?",
            "type": "Technical",
            "hint": "Expand on the key technical decisions you made.",
        }
