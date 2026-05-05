import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "qwen/qwen3-32b";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

    const body = await req.json();
    const {
      job_title,
      last_question,
      answer,
      question_type = "Technical",
      history = [],
      turn_number = 1,
      total_turns = 5,
      language = "en",
    } = body;

    if (!answer?.trim() || answer.trim().length < 5) {
      return NextResponse.json({ detail: "Answer too short." }, { status: 400 });
    }

    const isFr = language === "fr";
    const isLast = turn_number >= total_turns;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // ── Step 1: Evaluate the answer ────────────────────────────────────────
    const evalPrompt = isFr
      ? `Tu es un interviewer technique évaluant une réponse à un entretien pour le poste de ${job_title}.
Question (${question_type}): ${last_question}
Réponse du candidat: ${answer}

Évalue la réponse. Réponds UNIQUEMENT avec un JSON valide, sans balises markdown.
Format: { "score": <0-100>, "verdict": "<mot ou phrase courte>", "what_was_good": "<1-2 phrases>", "what_was_missing": "<1-2 phrases>", "ideal_answer_summary": "<2-3 phrases>" }`
      : `You are a technical interviewer evaluating an interview answer for the role of ${job_title}.
Question (${question_type}): ${last_question}
Candidate answer: ${answer}

Evaluate the answer. Reply ONLY with valid JSON, no markdown fences.
Format: { "score": <0-100>, "verdict": "<single word or short phrase>", "what_was_good": "<1-2 sentences>", "what_was_missing": "<1-2 sentences>", "ideal_answer_summary": "<2-3 sentences>" }`;

    const evalResp = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 350,
    });

    let evaluation: Record<string, unknown> = { score: 50, verdict: "OK", what_was_good: "", what_was_missing: "", ideal_answer_summary: "" };
    try { evaluation = JSON.parse(evalResp.choices[0]?.message?.content ?? ""); } catch { /* use defaults */ }

    // ── Step 2: Generate follow-up or closing ──────────────────────────────
    const historyText = history
      .map((h: { role: string; content: string }) => `${h.role === "ai" ? "Interviewer" : "Candidate"}: ${h.content}`)
      .join("\n");

    const followupPrompt = isLast
      ? (isFr
          ? `Tu conclus l'entretien pour le poste de ${job_title}. Fournis une phrase de clôture chaleureuse et professionnelle.
Réponds UNIQUEMENT avec un JSON valide.
Format: { "response": "<phrase de clôture>", "next_question": "", "question_type": "Technical", "hint": "", "is_last": true }`
          : `You are closing the interview for ${job_title}. Provide a warm, professional closing sentence.
Reply ONLY with valid JSON, no markdown.
Format: { "response": "<closing sentence>", "next_question": "", "question_type": "Technical", "hint": "", "is_last": true }`)
      : (isFr
          ? `Tu es interviewer pour le poste de ${job_title}. Voici l'historique :
${historyText}
Dernière question : ${last_question}
Réponse du candidat : ${answer}

Acquiesce brièvement la réponse (sans mentionner de score), puis pose la prochaine question d'entretien.
Réponds UNIQUEMENT avec un JSON valide, sans balises markdown.
Format: { "response": "<1 phrase d'acquiescement>", "next_question": "<prochaine question>", "question_type": "Technical|System Design|Behavioral|Coding", "hint": "<1 phrase indice>", "is_last": false }`
          : `You are interviewing for the role of ${job_title}. Interview history so far:
${historyText}
Last question: ${last_question}
Candidate answer: ${answer}

Acknowledge the answer briefly (do NOT mention any score), then ask the next interview question.
Reply ONLY with valid JSON, no markdown fences.
Format: { "response": "<1-sentence acknowledgement>", "next_question": "<next question>", "question_type": "Technical|System Design|Behavioral|Coding", "hint": "<1-sentence hint>", "is_last": false }`);

    const followupResp = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: followupPrompt }],
      temperature: 0.5,
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    let followup: Record<string, unknown> = { response: "", next_question: "", question_type: "Technical", hint: "", is_last: isLast };
    try { followup = JSON.parse(followupResp.choices[0]?.message?.content ?? ""); } catch { /* use defaults */ }

    const speakText = `${followup.response ?? ""} ${followup.next_question ?? ""}`.trim();

    return NextResponse.json({
      evaluation,
      response:        followup.response        ?? "",
      next_question:   followup.next_question   ?? "",
      question_type:   followup.question_type   ?? "Technical",
      hint:            followup.hint            ?? "",
      is_last:         followup.is_last         ?? isLast,
      speak_text:      speakText,
      audio_b64:       null,
      use_browser_tts: true,
      turn_number:     turn_number + 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/answer] error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
