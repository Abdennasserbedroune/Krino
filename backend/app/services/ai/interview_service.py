"""Groq-powered interview question generation and answer evaluation."""
import json
from typing import Any, Dict, List
from app.services.ai.groq_client import get_groq_client
from app.core.config import settings


# ── Question generation ───────────────────────────────────────────────────────

def generate_interview_questions(
    job_title: str,
    job_field: str,
    experience_level: str = "Mid",
    company_name: str = "",
    tech_stack: str = "",
    extra_context: str = "",
    language: str = "en",
) -> List[Dict[str, Any]]:
    """Generate 10 targeted interview questions via Groq.

    Returns a list of dicts with keys:
        id, question, type, difficulty, hint
    """
    client = get_groq_client()

    company_line  = f"Company: {company_name}\n" if company_name else ""
    stack_line    = f"Tech stack / tools: {tech_stack}\n" if tech_stack else ""
    context_line  = f"Extra context: {extra_context}\n" if extra_context else ""
    lang_note     = "Respond entirely in French. All JSON string values must be in French.\n" if language == "fr" else ""

    # Difficulty distribution by level
    diff_map = {
        "Junior":     "5 Easy, 4 Medium, 1 Hard",
        "Mid":        "2 Easy, 5 Medium, 3 Hard",
        "Senior":     "1 Easy, 3 Medium, 6 Hard",
        "Lead / Staff": "0 Easy, 2 Medium, 8 Hard",
    }
    diff_dist = diff_map.get(experience_level, "2 Easy, 5 Medium, 3 Hard")

    system_prompt = (
        "You are a senior technical interviewer with 15 years of experience across multiple industries.\n"
        "Your questions must be specific, realistic, and match the seniority level exactly.\n"
        "Rules:\n"
        "- Mix question types: Coding, Technical, System Design, Behavioral, Case Study\n"
        "- Coding questions for technical roles MUST include a concrete problem or bug to solve\n"
        "- System Design questions must be scoped to the company size and tech stack\n"
        "- Behavioral questions must follow STAR method framing\n"
        "- Each hint must be a genuine, non-obvious interviewer tip (not a rephrasing of the question)\n"
        "- Return ONLY valid JSON — no markdown, no explanation outside JSON"
    )

    user_prompt = (
        f"{lang_note}"
        f"Role: {job_title}\n"
        f"Field: {job_field}\n"
        f"Level: {experience_level}\n"
        f"{company_line}{stack_line}{context_line}"
        f"Difficulty distribution: {diff_dist}\n\n"
        "Generate exactly 10 interview questions. Return a JSON object with a single key \'questions\' "
        "containing an array of 10 objects. Each object must have these exact keys:\n"
        "  id: integer 1-10\n"
        "  question: string — the full question text\n"
        "  type: one of: Coding, Technical, System Design, Behavioral, Case Study\n"
        "  difficulty: one of: Easy, Medium, Hard\n"
        "  hint: string — a concrete interviewer tip for answering this specific question\n"
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
            max_tokens=3000,
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        questions = data.get("questions", [])
        # Ensure ids are sequential ints
        for i, q in enumerate(questions):
            q["id"] = i + 1
        return questions
    except Exception as e:
        print(f"[interview_service] generate_questions failed: {e}")
        return []


# ── Answer evaluation ─────────────────────────────────────────────────────────

def evaluate_interview_answer(
    question: str,
    answer: str,
    job_title: str,
    question_type: str = "Technical",
    language: str = "en",
) -> Dict[str, Any]:
    """Evaluate a candidate answer and return structured feedback.

    Returns a dict with keys:
        score (0-100), verdict, what_was_good,
        what_was_missing, ideal_answer_summary
    """
    client = get_groq_client()

    lang_note = "Respond entirely in French. All JSON string values must be in French.\n" if language == "fr" else ""

    system_prompt = (
        "You are a brutally honest but constructive senior interviewer.\n"
        "Evaluate the candidate's answer to the given interview question.\n"
        "Rules:\n"
        "- Score 0-100: 0-40 poor, 41-65 average, 66-80 good, 81-100 excellent\n"
        "- verdict must be one short punchy sentence (max 10 words)\n"
        "- what_was_good: specific strengths, reference exact phrases from the answer\n"
        "- what_was_missing: concrete gaps — name the missing concept/framework/detail\n"
        "- ideal_answer_summary: what a perfect answer would have included (2-3 sentences)\n"
        "- Return ONLY valid JSON"
    )

    user_prompt = (
        f"{lang_note}"
        f"Role being interviewed for: {job_title}\n"
        f"Question type: {question_type}\n\n"
        f"Question: {question}\n\n"
        f"Candidate answer: {answer}\n\n"
        "Return a JSON object with exactly these keys:\n"
        "  score: integer 0-100\n"
        "  verdict: string\n"
        "  what_was_good: string\n"
        "  what_was_missing: string\n"
        "  ideal_answer_summary: string\n"
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
        print(f"[interview_service] evaluate_answer failed: {e}")
        return {
            "score": 0,
            "verdict": "Evaluation failed — please retry.",
            "what_was_good": "",
            "what_was_missing": "",
            "ideal_answer_summary": str(e),
        }


# ── Live interview — follow-up question generation ────────────────────────────

def generate_followup_question(
    job_title: str,
    job_field: str,
    experience_level: str,
    conversation_history: List[Dict[str, str]],
    last_evaluation: Dict[str, Any],
    turn_number: int,
    total_turns: int,
    language: str = "en",
) -> str:
    """Generate a contextual follow-up question based on conversation history.

    Returns plain question text (not JSON).
    """
    client = get_groq_client()

    lang_note = "Respond entirely in French.\n" if language == "fr" else ""

    history_text = ""
    for turn in conversation_history[-6:]:  # last 3 exchanges max
        role  = "Interviewer" if turn["role"] == "assistant" else "Candidate"
        history_text += f"{role}: {turn['content']}\n\n"

    gaps = last_evaluation.get("what_was_missing", "")
    score = last_evaluation.get("score", 50)

    system_prompt = (
        "You are a senior interviewer conducting a live technical interview.\n"
        "Based on the conversation so far, generate ONE natural follow-up question.\n"
        "Rules:\n"
        "- If the last answer had gaps, probe those gaps specifically\n"
        "- If the last answer was strong (score > 75), escalate difficulty\n"
        "- Keep the question conversational — this is a dialogue, not a quiz\n"
        "- Never repeat a question already asked\n"
        f"- This is turn {turn_number} of {total_turns} — "
        + ("wrap up with a final reflective question" if turn_number >= total_turns - 1 else "keep building depth") +
        "\n- Return ONLY the question text, no preamble, no numbering"
    )

    user_prompt = (
        f"{lang_note}"
        f"Role: {job_title} | Field: {job_field} | Level: {experience_level}\n"
        f"Previous answer score: {score}/100\n"
        f"Gaps identified: {gaps}\n\n"
        f"=== CONVERSATION SO FAR ===\n{history_text}\n"
        "Generate the next interview question:"
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.8,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[interview_service] generate_followup failed: {e}")
        return "Can you elaborate on your previous answer?"
