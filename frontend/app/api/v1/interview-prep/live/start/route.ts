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
    const {
      job_title        = "",
      job_field        = "",
      experience_level = "Mid",
      company_name     = "",
      tech_stack       = "",
      language         = "en",
      voice            = "diana",
      total_turns: rawTurns = 5,
    } = body;

    if (!job_title?.trim() || !job_field?.trim())
      return NextResponse.json({ detail: "job_title and job_field are required." }, { status: 400 });

    const total_turns = Math.min(Math.max(Number(rawTurns) || 5, 1), 20);
    const isFr        = language === "fr";

    const sanitize = (s: string) =>
      String(s ?? "").replace(/[\r\n`]/g, " ").trim().slice(0, 200);

    const ctx = [
      sanitize(company_name) && (isFr ? `Entreprise : ${sanitize(company_name)}.` : `Company: ${sanitize(company_name)}.`),
      sanitize(tech_stack)   && (isFr ? `Stack : ${sanitize(tech_stack)}.`        : `Tech stack: ${sanitize(tech_stack)}.`),
    ].filter(Boolean).join(" ");

    const prompt = isFr
      ? `Tu es un interviewer technique humain et chaleureux. Tu conduis un entretien simulé pour : ${sanitize(job_title)} (${experience_level}). ${ctx}
Sois accueillant, détendu mais professionnel. Utilise des formulations naturelles.
Wrappe ton accueil dans un tag d'émotion Orpheus approprié : [cheerful], [professional], [thoughtful] ou [serious].
Accueille le candidat en une phrase naturelle, puis pose ta première question précise et contextuelle.
Réponds UNIQUEMENT avec du JSON valide sans markdown :
{"greeting":"[cheerful] …","first_question":"[thoughtful] …","question_type":"Technical","hint":"…"}`
      : `You are a warm, human technical interviewer for: ${sanitize(job_title)} (${experience_level}). ${ctx}
Be welcoming and natural — use openers like "Alright", "Great to meet you", "So".
Wrap your greeting and question each in an appropriate Orpheus emotion tag: [cheerful], [professional], [thoughtful], or [serious].
Greet the candidate in one natural sentence, then ask a precise, role-specific first interview question.
Reply ONLY with valid JSON, no markdown:
{"greeting":"[cheerful] …","first_question":"[thoughtful] …","question_type":"Technical","hint":"…"}`;

    const groq = new Groq({ apiKey: key });
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 20_000);

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "user", content: prompt }],
      temperature:     0.7,
      max_tokens:      512,
      response_format: { type: "json_object" },
    });
    clearTimeout(tid);

    const opening       = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as Record<string, string>;
    const greeting      = opening.greeting      || (isFr ? "[cheerful] Bonjour, ravi de vous rencontrer." : "[cheerful] Hey, great to meet you!");
    const first_q       = opening.first_question || (isFr ? "[thoughtful] Parlez-moi de votre expérience." : "[thoughtful] Tell me a bit about yourself.");
    const question_type = opening.question_type  || "Technical";
    const hint          = opening.hint           || "";
    const speak_text    = `${greeting} ${first_q}`.trim();

    // Strip tags for display — tags are for TTS only
    const clean = (s: string) => s.replace(/\[\w+\]\s*/g, "").trim();

    const tts = await synthesiseWithFallback(speak_text, voice);

    return NextResponse.json({
      greeting:        clean(greeting),
      first_question:  clean(first_q),      // ← correct field name
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
    console.error("[live/start] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
