"""Interview preparation AI service — question generation and answer evaluation.

All public functions accept a `language` parameter ('en' | 'fr').
When 'fr', every AI response including JSON values is produced in French.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.services.ai.groq_client import get_groq_client
from app.core.config import settings
from app.services.ai.language_utils import get_language_directive


# ─── Question types per level ─────────────────────────────────────────────────
_LEVEL_TYPE_MAP: Dict[str, List[str]] = {
    "Junior":     ["Technical", "Behavioral", "Coding", "Behavioral", "Technical",
                   "Behavioral", "Technical", "Coding", "Behavioral", "Technical"],
    "Mid":        ["Technical", "Coding", "System Design", "Behavioral", "Technical",
                   "Coding", "Behavioral", "Technical", "Case Study", "Behavioral"],
    "Senior":     ["System Design", "Coding", "Technical", "Behavioral", "System Design",
                   "Coding", "Case Study", "Technical", "Behavioral", "System Design"],
    "Lead / Staff": ["System Design", "Case Study", "Behavioral", "System Design", "Technical",
                     "Case Study", "Behavioral", "System Design", "Coding", "Case Study"],
}

_DIFFICULTY_MAP: Dict[str, List[str]] = {
    "Junior":     ["Easy",   "Easy",   "Easy",   "Medium", "Easy",
                   "Medium", "Medium", "Medium", "Easy",   "Medium"],
    "Mid":        ["Medium", "Medium", "Medium", "Easy",   "Hard",
                   "Medium", "Medium", "Hard",   "Medium", "Easy"],
    "Senior":     ["Hard",   "Hard",   "Hard",   "Medium", "Hard",
                   "Hard",   "Hard",   "Medium", "Hard",   "Hard"],
    "Lead / Staff": ["Hard", "Hard",   "Hard",   "Hard",   "Hard",
                     "Hard",   "Hard",   "Hard",   "Hard",   "Hard"],
}

_FR_DIFFICULTY: Dict[str, str] = {
    "Easy": "Facile", "Medium": "Moyen", "Hard": "Difficile",
}
_FR_TYPE: Dict[str, str] = {
    "Technical":     "Technique",
    "Coding":        "Codage",
    "System Design": "Conception Système",
    "Behavioral":    "Comportemental",
    "Case Study":    "Étude de cas",
}


def _localise_questions(questions: List[Dict], language: str) -> List[Dict]:
    """Translate difficulty/type labels to French when needed."""
    if language != "fr":
        return questions
    for q in questions:
        q["difficulty"] = _FR_DIFFICULTY.get(q.get("difficulty", ""), q.get("difficulty", ""))
        q["type"]       = _FR_TYPE.get(q.get("type", ""), q.get("type", ""))
    return questions


# ─── Question generation ──────────────────────────────────────────────────────

def generate_interview_questions(
    job_title:        str,
    job_field:        str,
    experience_level: str  = "Mid",
    company_name:     str  = "",
    tech_stack:       str  = "",
    extra_context:    str  = "",
    language:         str  = "en",
) -> List[Dict[str, Any]]:
    """Generate 10 interview questions tailored to the role and level.

    Returns a list of dicts: { id, question, type, difficulty, hint }
    """
    client        = get_groq_client()
    lang_dir      = get_language_directive(language)
    level         = experience_level if experience_level in _LEVEL_TYPE_MAP else "Mid"
    types         = _LEVEL_TYPE_MAP[level]
    difficulties  = _DIFFICULTY_MAP[level]

    company_line  = f"Company: {company_name}\n" if company_name else ""
    stack_line    = f"Tech stack: {tech_stack}\n"  if tech_stack   else ""
    extra_line    = f"Extra context: {extra_context}\n" if extra_context else ""
    fr_note       = "\nAll question text and hint values MUST be in French.\n" if language == "fr" else ""

    # Build the question spec list so the model knows exactly what to produce
    spec_lines = []
    for i, (t, d) in enumerate(zip(types, difficulties), 1):
        spec_lines.append(f"  Q{i}: type={t}, difficulty={d}")
    spec_block = "\n".join(spec_lines)

    system_prompt = (
        "You are a senior technical interviewer with 15+ years of experience hiring "
        "across all engineering and business domains.\n"
        "Generate exactly 10 interview questions that are realistic, specific, and "
        "appropriate for the role and experience level.\n"
        "Rules:\n"
        "- Coding questions must include actual code snippets, bugs to find, or algorithms to design\n"
        "- System Design questions must name specific systems (e.g. design Twitter's feed, not 'a social app')\n"
        "- Behavioral questions must follow STAR-method framing\n"
        "- Each hint is a single sentence guiding the approach, NOT the answer\n"
        "- Never produce generic filler questions"
        + lang_dir
    )

    user_prompt = (
        f"Role: {job_title}\n"
        f"Field: {job_field}\n"
        f"Level: {level}\n"
        f"{company_line}{stack_line}{extra_line}"
        f"{fr_note}"
        f"\nProduce exactly these 10 questions in this order:\n{spec_block}\n\n"
        "Return a JSON object with key 'questions' containing an array of 10 objects.\n"
        "Each object: { \"id\": number, \"question\": string, \"type\": string, "
        "\"difficulty\": string, \"hint\": string }\n"
        "Keep the type and difficulty values exactly as specified in the spec above."
    )

    try:
        response = client.chat.completions.create(
            model    = settings.GROQ_MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature     = 0.7,
            response_format = {"type": "json_object"},
            max_tokens      = 4000,
        )
        data      = json.loads(response.choices[0].message.content.strip())
        questions = data.get("questions", [])
        # Ensure IDs are sequential ints
        for i, q in enumerate(questions, 1):
            q["id"] = i
        return _localise_questions(questions, language)
    except Exception as e:
        print(f"[interview_service] generate_interview_questions failed: {e}")
        raise


# ─── Answer evaluation ────────────────────────────────────────────────────────

def evaluate_interview_answer(
    question:      str,
    answer:        str,
    job_title:     str  = "Software Engineer",
    question_type: str  = "Technical",
    language:      str  = "en",
) -> Dict[str, Any]:
    """Evaluate a candidate's answer to an interview question.

    Returns: { score: int 0-100, verdict: str, what_was_good: str,
               what_was_missing: str, ideal_answer_summary: str }
    """
    client   = get_groq_client()
    lang_dir = get_language_directive(language)
    fr_note  = "\nAll string values in the JSON MUST be in French.\n" if language == "fr" else ""

    system_prompt = (
        "You are a strict but fair senior interviewer evaluating a candidate's answer.\n"
        "Scoring guide:\n"
        "  90-100 : Exceptional — complete, specific, well-structured, shows mastery\n"
        "  70-89  : Strong — covers key points, minor gaps\n"
        "  50-69  : Adequate — hits basics but lacks depth or specifics\n"
        "  30-49  : Weak — misses important aspects or too vague\n"
        "  0-29   : Poor — incorrect, off-topic, or no real answer\n"
        "Be honest. Do not inflate scores. Reference specifics from the answer."
        + lang_dir
    )

    user_prompt = (
        f"Job title: {job_title}\n"
        f"Question type: {question_type}\n"
        f"{fr_note}"
        f"=== QUESTION ===\n{question}\n\n"
        f"=== CANDIDATE ANSWER ===\n{answer}\n\n"
        "Evaluate and return a JSON object with exactly these keys:\n"
        "- score: integer 0-100\n"
        "- verdict: short label (e.g. 'Strong', 'Needs work', 'Excellent', 'Weak')\n"
        "- what_was_good: 1-2 sentences on what the candidate did well\n"
        "- what_was_missing: 1-2 sentences on what was lacking or incorrect\n"
        "- ideal_answer_summary: 2-3 sentences describing what a great answer would include"
    )

    try:
        response = client.chat.completions.create(
            model    = settings.GROQ_MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature     = 0.2,
            response_format = {"type": "json_object"},
            max_tokens      = 800,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"[interview_service] evaluate_interview_answer failed: {e}")
        raise


# ─── Live interview — first question ─────────────────────────────────────────

def generate_live_opening(
    job_title:        str,
    job_field:        str,
    experience_level: str = "Mid",
    company_name:     str = "",
    tech_stack:       str = "",
    language:         str = "en",
) -> Dict[str, Any]:
    """Generate the AI interviewer's opening message and first question.

    Returns: { greeting: str, first_question: str, question_type: str, hint: str }
    """
    client   = get_groq_client()
    lang_dir = get_language_directive(language)
    company_line = f" at {company_name}" if company_name else ""
    fr_note  = "\nAll string values MUST be in French.\n" if language == "fr" else ""

    system_prompt = (
        "You are a warm but professional interviewer conducting a real job interview.\n"
        "Start with a brief, natural greeting (1 sentence), then ask the first interview question.\n"
        "The question must be appropriate for the role and level."
        + lang_dir
    )

    user_prompt = (
        f"Role: {job_title}{company_line}\n"
        f"Field: {job_field}\n"
        f"Level: {experience_level}\n"
        f"{f'Tech stack: {tech_stack}' if tech_stack else ''}"
        f"\n{fr_note}"
        "Return a JSON object with exactly these keys:\n"
        "- greeting: the opening sentence (e.g. 'Thanks for joining today — let's get started.')\n"
        "- first_question: the first interview question\n"
        "- question_type: one of Technical / Coding / System Design / Behavioral / Case Study\n"
        "- hint: one-sentence hint for the interviewee (shown optionally)"
    )

    try:
        response = client.chat.completions.create(
            model    = settings.GROQ_MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature     = 0.7,
            response_format = {"type": "json_object"},
            max_tokens      = 600,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"[interview_service] generate_live_opening failed: {e}")
        raise


# ─── Live interview — follow-up question after answer ────────────────────────

def generate_live_followup(
    job_title:     str,
    history:       List[Dict[str, str]],  # [{role: "ai"|"user", content: str}]
    last_answer:   str,
    evaluation:    Dict[str, Any],
    language:      str = "en",
    turn_number:   int = 1,
    total_turns:   int = 5,
) -> Dict[str, Any]:
    """Generate AI interviewer's follow-up after evaluating the candidate's answer.

    Returns: { response: str, next_question: str, question_type: str,
               hint: str, is_last: bool }
    """
    client   = get_groq_client()
    lang_dir = get_language_directive(language)
    fr_note  = "\nAll string values MUST be in French.\n" if language == "fr" else ""
    is_last  = turn_number >= total_turns

    history_text = "\n".join(
        f"{'Interviewer' if h['role'] == 'ai' else 'Candidate'}: {h['content']}"
        for h in history[-6:]  # last 3 turns max
    )

    closing_instruction = (
        "This is the LAST question. After the response key write a natural closing "
        "sentence in the 'next_question' field (e.g. 'That\'s all from my side — thank you for your time.') "
        "and set is_last to true."
        if is_last else
        f"This is turn {turn_number} of {total_turns}. Ask the next logical interview question."
    )

    system_prompt = (
        "You are a professional interviewer conducting a live interview.\n"
        "After each candidate answer:\n"
        "1. Give a brief, natural acknowledgement (1 sentence — NOT a full evaluation)\n"
        "2. Ask the next interview question or close the interview\n"
        "Keep the tone professional and conversational."
        + lang_dir
    )

    user_prompt = (
        f"Job title: {job_title}\n"
        f"Candidate score on last answer: {evaluation.get('score', 'N/A')}/100\n"
        f"{fr_note}"
        f"=== CONVERSATION SO FAR ===\n{history_text}\n\n"
        f"=== LAST ANSWER ===\n{last_answer}\n\n"
        f"{closing_instruction}\n\n"
        "Return JSON with exactly these keys:\n"
        "- response: brief acknowledgement of the last answer (1 sentence, natural)\n"
        "- next_question: next question OR closing sentence if is_last\n"
        "- question_type: Technical / Coding / System Design / Behavioral / Case Study\n"
        "- hint: one-sentence hint (empty string if is_last)\n"
        "- is_last: boolean"
    )

    try:
        response = client.chat.completions.create(
            model    = settings.GROQ_MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature     = 0.7,
            response_format = {"type": "json_object"},
            max_tokens      = 600,
        )
        data = json.loads(response.choices[0].message.content.strip())
        data["is_last"] = bool(data.get("is_last", is_last))
        return data
    except Exception as e:
        print(f"[interview_service] generate_live_followup failed: {e}")
        raise
