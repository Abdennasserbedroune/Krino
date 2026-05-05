import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;
const MODEL = "llama-3.1-8b-instant";

function extractJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return {};
}

async function synthesise(text: string): Promise<string | null> {
  const token = process.env.HF_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      "https://router.huggingface.co/fal-ai/kokoro/v1/audio/speech",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "kokoro", input: text, voice: "af_heart", response_format: "mp3" }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY)
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });

    const body = await req.json();
    const { job_title = "", last_question = "", answer = "",
            question_type = "Technical", history = [],
            turn_number = 1, total_turns = 5, language = "en" } = body;

    if (!answer?.trim() || answer.trim().length < 5)
      return NextResponse.json({ detail: "Answer too short." }, { status: 400 });

    const isFr   = language === "fr";
    const isLast = turn_number >= total_turns;
    const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // ── Evaluate ──────────────────────────────────────────────────────────
    const evalPrompt = isFr
      ? `Tu \u00e9values une r\u00e9ponse d'entretien pour le poste : ${job_title}.
Question (${question_type}) : ${last_question}
R\u00e9ponse : ${answer}
R\u00e9ponds UNIQUEMENT avec du JSON valide (pas de markdown) :
{"score":75,"verdict":"Bon","what_was_good":"\u2026","what_was_missing":"\u2026","ideal_answer_summary":"\u2026"}`
      : `Evaluate this interview answer for the role: ${job_title}.
Question (${question_type}): ${last_question}
Answer: ${answer}
Reply ONLY with valid JSON (no markdown):
{"score":75,"verdict":"Good","what_was_good":"\u2026","what_was_missing":"\u2026","ideal_answer_summary":"\u2026"}`;

    const evalResp = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.2, max_tokens: 400,
    });
    const evaluation: Record<string, unknown> = {
      score: 50, verdict: "OK", what_was_good: "", what_was_missing: "", ideal_answer_summary: "",
      ...extractJson(evalResp.choices[0]?.message?.content ?? ""),
    };

    // ── Follow-up (humanized) ──────────────────────────────────────────────
    const historyText = (history as { role: string; content: string }[])
      .map(h => `${h.role === "ai" ? "Interviewer" : "Candidate"}: ${h.content}`).join("\n");

    const followupPrompt = isLast
      ? (isFr
        ? `Tu conclus l'entretien pour ${job_title}. Remercie le candidat chaleureusement et naturellement, comme un vrai humain.
R\u00e9ponds UNIQUEMENT avec du JSON valide :
{"response":"\u2026","next_question":"","question_type":"Technical","hint":"","is_last":true}`
        : `You are closing the interview for ${job_title}. Thank the candidate warmly and naturally, like a real human would.
Reply ONLY with valid JSON:
{"response":"\u2026","next_question":"","question_type":"Technical","hint":"","is_last":true}`)
      : (isFr
        ? `Tu es un interviewer humain et naturel pour ${job_title}. Voici la conversation jusqu'ici :
${historyText}
Derni\u00e8re question : ${last_question}
R\u00e9ponse du candidat : ${answer}

Ton r\u00f4le : R\u00e9agis d'abord humainement \u00e0 la r\u00e9ponse (1 phrase naturelle \u2014 "Oui c'est int\u00e9ressant", "Ah oui bonne approche", "D'accord, je vois") puis enchan\u00eete naturellement vers la question suivante.
NE mentionne JAMAIS de score. Sois conversationnel, pas robotique.
R\u00e9ponds UNIQUEMENT avec du JSON valide :
{"response":"\u2026","next_question":"\u2026","question_type":"Technical|System Design|Behavioral|Coding","hint":"\u2026","is_last":false}`
        : `You are a natural, human interviewer for ${job_title}. Here is the conversation so far:
${historyText}
Last question: ${last_question}
Candidate answer: ${answer}

Your job: First react humanly to their answer in 1 natural sentence (e.g. "Right, that makes sense.", "Interesting approach.", "Yeah, I can see that.", "Got it, good point.") then naturally transition to the next question.
NEVER mention a score. Be conversational, not robotic. Vary your reactions.
Reply ONLY with valid JSON:
{"response":"\u2026","next_question":"\u2026","question_type":"Technical|System Design|Behavioral|Coding","hint":"\u2026","is_last":false}`);

    const followupResp = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: "user", content: followupPrompt }],
      temperature: 0.65, max_tokens: 500,
    });
    const followup: Record<string, unknown> = {
      response: "", next_question: "", question_type: "Technical", hint: "", is_last: isLast,
      ...extractJson(followupResp.choices[0]?.message?.content ?? ""),
    };

    const speakText = `${followup.response ?? ""} ${followup.next_question ?? ""}`.trim();
    const audio_b64 = await synthesise(speakText);

    return NextResponse.json({
      evaluation,
      response:        followup.response        ?? "",
      next_question:   followup.next_question   ?? "",
      question_type:   followup.question_type   ?? "Technical",
      hint:            followup.hint            ?? "",
      is_last:         followup.is_last         ?? isLast,
      speak_text:      speakText,
      audio_b64,
      use_browser_tts: !audio_b64,
      turn_number:     turn_number + 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/answer] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
