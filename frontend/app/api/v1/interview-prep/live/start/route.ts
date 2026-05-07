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
      job_title        = "",
      job_field        = "",
      experience_level = "Mid",
      company_name     = "",
      tech_stack       = "",
      language         = "en",
      voice            = "tara",      // default Orpheus voice
      total_turns: rawTurns = 5,
    } = body;

    if (!job_title?.trim() || !job_field?.trim())
      return NextResponse.json({ detail: "job_title and job_field are required." }, { status: 400 });

    const total_turns = Math.min(Math.max(Number(rawTurns) || 5, 1), 20);
    const isFr        = language === "fr";
    const sanitize    = (s: string) => String(s ?? "").replace(/[\r\n`]/g, " ").trim().slice(0, 200);

    const ctx = [
      sanitize(company_name) && (isFr ? `Entreprise : ${sanitize(company_name)}.` : `Company: ${sanitize(company_name)}.`),
      sanitize(tech_stack)   && (isFr ? `Stack : ${sanitize(tech_stack)}.`        : `Tech stack: ${sanitize(tech_stack)}.`),
    ].filter(Boolean).join(" ");

    const prompt = isFr
      ? `Tu es un interviewer technique humain. Entretien pour : ${sanitize(job_title)} (${experience_level}). ${ctx}
Accueille le candidat en une phrase naturelle avec un tag émotion Orpheus au début (ex: [cheerful]), puis pose ta première question précise.
Réponds UNIQUEMENT avec du JSON valide sans markdown :
{"greeting":"[cheerful] …","first_question":"[thoughtful] …","question_type":"Technical","hint":"…"}`
      : `You are a natural human technical interviewer. Role: ${sanitize(job_title)} (${experience_level}). ${ctx}
Greet the candidate warmly in one sentence — start with an Orpheus emotion tag (e.g. [cheerful]) — then ask a precise, role-specific first question — also with an emotion tag.
Reply ONLY with valid JSON, no markdown:
{"greeting":"[cheerful] …","first_question":"[thoughtful] …","question_type":"Technical","hint":"…"}`;

    const groq = new Groq({ apiKey: key });
    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "user", content: prompt }],
      temperature:     0.7,
      max_tokens:      512,
      response_format: { type: "json_object" },
    });

    const opening      = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as Record<string, string>;
    const greeting     = opening.greeting      || (isFr ? "[cheerful] Bonjour !" : "[cheerful] Hey, great to meet you!");
    const first_q      = opening.first_question|| (isFr ? "[thoughtful] Parlez-moi de vous." : "[thoughtful] Tell me about yourself.");
    const question_type= opening.question_type || "Technical";
    const hint         = opening.hint          || "";
    const speak_text   = `${greeting} ${first_q}`.trim();
    const clean        = (s: string) => s.replace(/\[\w+\]\s*/g, "").trim();

    console.log("[start] LLM done. speak_text preview:", speak_text.slice(0, 80));
    const tts = await synthesiseWithFallback(speak_text, voice);
    console.log("[start] TTS result: use_browser_tts=", tts.use_browser_tts, "audio_b64 len=", tts.audio_b64?.length ?? 0);

    return NextResponse.json({
      greeting:        clean(greeting),
      first_question:  clean(first_q),
      question_type,
      hint,
      speak_text:      clean(speak_text),
      audio_b64:       tts.audio_b64,
      mime:            tts.mime,
      use_browser_tts: tts.use_browser_tts,
      total_turns,
      turn_number:     1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[start] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
