import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "llama-3.1-8b-instant";

function extractJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return {};
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

    const body = await req.json();
    const {
      job_title     = "",
      last_question = "",
      answer        = "",
      question_type = "Technical",
      history       = [],
      turn_number   = 1,
      total_turns   = 5,
      language      = "en",
    } = body;

    if (!answer?.trim() || answer.trim().length < 5) {
      return NextResponse.json({ detail: "Answer too short." }, { status: 400 });
    }

    const isFr   = language === "fr";
    const isLast = turn_number >= total_turns;
    const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // ── Step 1: Evaluate ────────────────────────────────────────────────────
    const evalPrompt = isFr
      ? `Tu évalues une réponse d'entretien pour le poste : ${job_title}.
Question (${question_type}) : ${last_question}
Réponse : ${answer}

Réponds UNIQUEMENT avec du JSON valide (pas de markdown) :
{"score":75,"verdict":"Bon","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`
      : `You are evaluating an interview answer for the role: ${job_title}.
Question (${question_type}): ${last_question}
Answer: ${answer}

Reply ONLY with valid JSON (no markdown):
{"score":75,"verdict":"Good","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`;

    const evalResp = await groq.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: "user", content: evalPrompt }],
      temperature: 0.2,
      max_tokens:  400,
    });

    const evaluation: Record<string, unknown> = {
      score: 50, verdict: "OK",
      what_was_good: "", what_was_missing: "", ideal_answer_summary: "",
      ...extractJson(evalResp.choices[0]?.message?.content ?? ""),
    };

    // ── Step 2: Follow-up or closing ────────────────────────────────────────
    const historyText = (history as { role: string; content: string }[])
      .map(h => `${h.role === "ai" ? "Interviewer" : "Candidate"}: ${h.content}`)
      .join("\n");

    const followupPrompt = isLast
      ? (isFr
          ? `Conclus l'entretien pour ${job_title} avec une phrase de clôture chaleureuse.
Réponds UNIQUEMENT avec du JSON valide (pas de markdown) :
{"response":"…","next_question":"","question_type":"Technical","hint":"","is_last":true}`
          : `Close the interview for ${job_title} with one warm professional sentence.
Reply ONLY with valid JSON (no markdown):
{"response":"…","next_question":"","question_type":"Technical","hint":"","is_last":true}`)
      : (isFr
          ? `Tu interviewes pour ${job_title}. Historique :
${historyText}
Dernière question : ${last_question}
Réponse : ${answer}

Acquiesce brièvement (sans score), puis pose la question suivante.
Réponds UNIQUEMENT avec du JSON valide (pas de markdown) :
{"response":"…","next_question":"…","question_type":"Technical","hint":"…","is_last":false}`
          : `You are interviewing for ${job_title}. History so far:
${historyText}
Last question: ${last_question}
Answer: ${answer}

Acknowledge briefly (no score), then ask the next question.
Reply ONLY with valid JSON (no markdown):
{"response":"…","next_question":"…","question_type":"Technical","hint":"…","is_last":false}`);

    const followupResp = await groq.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: "user", content: followupPrompt }],
      temperature: 0.5,
      max_tokens:  500,
    });

    const followup: Record<string, unknown> = {
      response: "", next_question: "",
      question_type: "Technical", hint: "", is_last: isLast,
      ...extractJson(followupResp.choices[0]?.message?.content ?? ""),
    };

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
    console.error("[live/answer] Groq error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
