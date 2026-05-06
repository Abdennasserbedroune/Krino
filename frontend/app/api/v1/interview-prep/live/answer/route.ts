import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { synthesiseWithFallback } from "@/lib/tts";

export const maxDuration = 60;
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });

    const body = await req.json();
    const { job_title = "", last_question = "", answer = "",
            question_type = "Technical", history = [],
            turn_number = 1, total_turns: rawTurns = 5, language = "en" } = body;

    if (!last_question?.trim() || !answer?.trim() || answer.trim().length < 5)
      return NextResponse.json({ detail: "last_question and answer are required." }, { status: 400 });

    const total_turns = Math.min(Math.max(Number(rawTurns) || 5, 1), 20);
    const isFr   = language === "fr";
    const isLast = Number(turn_number) >= total_turns;
    const groq   = new Groq({ apiKey: key });

    const sanitize = (s: string) =>
      String(s ?? "").replace(/[\r\n`]/g, " ").trim().slice(0, 400);

    const historyText = (history as { role: string; content: string }[])
      .map(h => `${h.role === "ai" ? "Interviewer" : "Candidate"}: ${h.content}`).join("\n");

    const evalPrompt = isFr
      ? `Tu évalues une réponse d'entretien pour le poste : ${sanitize(job_title)}.
Question (${question_type}) : ${sanitize(last_question)}
Réponse : ${sanitize(answer)}
Réponds UNIQUEMENT avec du JSON valide :
{"score":75,"verdict":"Bon","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`
      : `Evaluate this interview answer for the role: ${sanitize(job_title)}.
Question (${question_type}): ${sanitize(last_question)}
Answer: ${sanitize(answer)}
Reply ONLY with valid JSON:
{"score":75,"verdict":"Good","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`;

    const followupPrompt = isLast
      ? (isFr
        ? `Tu conclus l'entretien pour ${sanitize(job_title)}. Remercie le candidat chaleureusement et naturellement.
Réponds UNIQUEMENT avec du JSON valide :
{"response":"…","next_question":"","question_type":"Technical","hint":"","is_last":true}`
        : `You are closing the interview for ${sanitize(job_title)}. Thank the candidate warmly and naturally.
Reply ONLY with valid JSON:
{"response":"…","next_question":"","question_type":"Technical","hint":"","is_last":true}`)
      : (isFr
        ? `Tu es un interviewer humain et naturel pour ${sanitize(job_title)}. Voici la conversation :\n${historyText}\nDernière question : ${sanitize(last_question)}\nRéponse du candidat : ${sanitize(answer)}\n\nRéagis d'abord humainement (1 phrase naturelle) puis enchaîne vers la prochaine question précise et contextuelle. NE mentionne JAMAIS de score.\nRéponds UNIQUEMENT avec du JSON valide :\n{"response":"…","next_question":"…","question_type":"Technical|System Design|Behavioral|Coding","hint":"…","is_last":false}`
        : `You are a natural, human interviewer for ${sanitize(job_title)}. Conversation so far:\n${historyText}\nLast question: ${sanitize(last_question)}\nCandidate answer: ${sanitize(answer)}\n\nFirst react naturally to their answer in 1 sentence (e.g. "Right, that makes sense.", "Interesting approach.") then transition to the next precise, role-specific question. NEVER mention a score.\nReply ONLY with valid JSON:\n{"response":"…","next_question":"…","question_type":"Technical|System Design|Behavioral|Coding","hint":"…","is_last":false}`);

    const [evalResp, followupResp] = await Promise.all([
      groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: evalPrompt }],
        temperature: 0.2, max_tokens: 400,
        response_format: { type: "json_object" },
      }).catch(() => null),
      groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: followupPrompt }],
        temperature: 0.65, max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    ]);

    const evaluation: Record<string, unknown> = {
      score: 50, verdict: isFr ? "OK" : "OK",
      what_was_good: "", what_was_missing: "", ideal_answer_summary: "",
      ...( evalResp ? JSON.parse(evalResp.choices[0]?.message?.content ?? "{}") : {} ),
    };

    const followup: Record<string, unknown> = {
      response: "", next_question: "", question_type: "Technical", hint: "", is_last: isLast,
      ...JSON.parse(followupResp.choices[0]?.message?.content ?? "{}"),
    };

    const speakText = `${followup.response ?? ""} ${followup.next_question ?? ""}`.trim();
    const tts = await synthesiseWithFallback(speakText);

    return NextResponse.json({
      evaluation,
      response:      followup.response      ?? "",
      next_question: followup.next_question ?? "",
      question_type: followup.question_type ?? "Technical",
      hint:          followup.hint          ?? "",
      is_last:       followup.is_last       ?? isLast,
      speak_text:    speakText,
      audio_b64:     tts.audio_b64,
      mime:          tts.mime,
      use_browser_tts: tts.use_browser_tts,
      turn_number:   Number(turn_number) + 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/answer] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
