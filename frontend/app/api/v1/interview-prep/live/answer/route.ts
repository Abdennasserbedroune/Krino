import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { synthesiseWithFallback } from "@/lib/tts";

export const maxDuration = 60;
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ detail: "GROQ_API_KEY not set." }, { status: 500 });

    const body = await req.json();
    const {
      job_title             = "",
      last_question         = "",
      answer                = "",
      question_type         = "Technical",
      history               = [],
      turn_number           = 1,
      total_turns: rawTurns = 5,
      language              = "en",
      voice                 = "tara",
    } = body;

    if (!last_question?.trim() || !answer?.trim() || answer.trim().length < 3)
      return NextResponse.json({ detail: "last_question and answer are required." }, { status: 400 });

    const total_turns = Math.min(Math.max(Number(rawTurns) || 5, 1), 20);
    const isFr        = language === "fr";
    const isLast      = Number(turn_number) >= total_turns;
    const groq        = new Groq({ apiKey: key });
    const sanitize    = (s: string) => String(s ?? "").replace(/[\r\n`]/g, " ").trim().slice(0, 400);

    const historyText = (history as { role: string; content: string }[])
      .slice(-8)
      .map(h => `${h.role === "ai" ? "Interviewer" : "Candidate"}: ${h.content}`)
      .join("\n");

    const evalPrompt = isFr
      ? `Évalue cette réponse d'entretien pour : ${sanitize(job_title)}.
Question (${question_type}) : ${sanitize(last_question)}
Réponse : ${sanitize(answer)}
Réponds UNIQUEMENT avec du JSON valide :
{"score":75,"verdict":"Bon","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`
      : `Evaluate this interview answer for: ${sanitize(job_title)}.
Question (${question_type}): ${sanitize(last_question)}
Answer: ${sanitize(answer)}
Reply ONLY with valid JSON:
{"score":75,"verdict":"Good","what_was_good":"…","what_was_missing":"…","ideal_answer_summary":"…"}`;

    const followupPrompt = isLast
      ? (isFr
        ? `Conclus l'entretien pour ${sanitize(job_title)} chaleureusement. Commence par [cheerful].
Réponds UNIQUEMENT avec du JSON valide :
{"response":"[cheerful] …","next_question":"","question_type":"Technical","hint":"","is_last":true}`
        : `Close the interview for ${sanitize(job_title)} warmly. Start with [cheerful].
Reply ONLY with valid JSON:
{"response":"[cheerful] …","next_question":"","question_type":"Technical","hint":"","is_last":true}`)
      : (isFr
        ? `Tu es un interviewer humain pour ${sanitize(job_title)}.
Conversation :\n${historyText}\nQ: ${sanitize(last_question)}\nRéponse: ${sanitize(answer)}\n
Réagis naturellement en 1 phrase (tag émotion Orpheus), puis pose la prochaine question précise (tag émotion).
Tags : [cheerful] [thoughtful] [serious] [professional] [laughs]
NE mentionne JAMAIS de score ou d'évaluation.
Réponds UNIQUEMENT avec du JSON valide :
{"response":"[cheerful] …","next_question":"[thoughtful] …","question_type":"Technical|System Design|Behavioral|Coding","hint":"…","is_last":false}`
        : `You are a natural human interviewer for ${sanitize(job_title)}.
Conversation:\n${historyText}\nQ: ${sanitize(last_question)}\nAnswer: ${sanitize(answer)}\n
React naturally in 1 sentence (Orpheus emotion tag), then ask the next precise question (emotion tag).
Tags: [cheerful] [thoughtful] [serious] [professional] [laughs]
NEVER mention scores or evaluation.
Reply ONLY with valid JSON:
{"response":"[thoughtful] …","next_question":"[professional] …","question_type":"Technical|System Design|Behavioral|Coding","hint":"…","is_last":false}`);

    const [evalResp, followupResp] = await Promise.all([
      groq.chat.completions.create({
        model: MODEL, messages: [{ role: "user", content: evalPrompt }],
        temperature: 0.2, max_tokens: 400, response_format: { type: "json_object" },
      }).catch(() => null),
      groq.chat.completions.create({
        model: MODEL, messages: [{ role: "user", content: followupPrompt }],
        temperature: 0.65, max_tokens: 500, response_format: { type: "json_object" },
      }),
    ]);

    const evaluation = {
      score: 50, verdict: "OK", what_was_good: "", what_was_missing: "", ideal_answer_summary: "",
      ...(evalResp ? JSON.parse(evalResp.choices[0]?.message?.content ?? "{}") : {}),
    };
    const followup = {
      response: "", next_question: "", question_type: "Technical", hint: "", is_last: isLast,
      ...JSON.parse(followupResp.choices[0]?.message?.content ?? "{}"),
    };

    const ttsText = `${followup.response ?? ""} ${followup.next_question ?? ""}`.trim();
    const clean   = (s: string) => String(s).replace(/\[\w+\]\s*/g, "").trim();

    console.log("[answer] followup preview:", ttsText.slice(0, 80));
    const tts = await synthesiseWithFallback(ttsText, voice);
    console.log("[answer] TTS result: use_browser_tts=", tts.use_browser_tts, "bytes=", tts.audio_b64?.length ?? 0);

    return NextResponse.json({
      evaluation,
      response:        clean(String(followup.response      ?? "")),
      next_question:   clean(String(followup.next_question ?? "")),
      question_type:   followup.question_type ?? "Technical",
      hint:            followup.hint          ?? "",
      is_last:         followup.is_last       ?? isLast,
      speak_text:      clean(ttsText),
      audio_b64:       tts.audio_b64,
      mime:            tts.mime,
      use_browser_tts: tts.use_browser_tts,
      turn_number:     Number(turn_number) + 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[answer] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
