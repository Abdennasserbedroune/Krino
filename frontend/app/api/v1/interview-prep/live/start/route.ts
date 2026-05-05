import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "llama-3.1-8b-instant";

function extractJson(raw: string): Record<string, string> {
  // Try direct parse first
  try { return JSON.parse(raw); } catch { /* fall through */ }
  // Try to extract first {...} block
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
      job_title        = "",
      job_field        = "",
      experience_level = "Mid",
      company_name     = "",
      tech_stack       = "",
      language         = "en",
      total_turns      = 5,
    } = body;

    if (!job_title?.trim() || !job_field?.trim()) {
      return NextResponse.json({ detail: "job_title and job_field are required." }, { status: 400 });
    }

    const isFr = language === "fr";
    const ctx = [
      company_name?.trim() ? (isFr ? `Entreprise : ${company_name}.` : `Company: ${company_name}.`) : "",
      tech_stack?.trim()   ? (isFr ? `Stack : ${tech_stack}.`        : `Tech stack: ${tech_stack}.`) : "",
    ].filter(Boolean).join(" ");

    const prompt = isFr
      ? `Tu es un interviewer technique senior. Tu commences un entretien simulé pour : ${job_title} (${experience_level}). ${ctx}
Accueille le candidat en une phrase, puis pose ta première question d'entretien.
Réponds UNIQUEMENT avec du JSON valide (pas de markdown) sous cette forme exacte :
{"greeting":"…","first_question":"…","question_type":"Technical","hint":"…"}`
      : `You are a senior technical interviewer starting a simulated interview for: ${job_title} (${experience_level}). ${ctx}
Greet the candidate in one sentence, then ask your first interview question.
Reply ONLY with valid JSON (no markdown) in exactly this shape:
{"greeting":"…","first_question":"…","question_type":"Technical","hint":"…"}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resp = await groq.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens:  512,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    const opening = extractJson(raw);

    const greeting       = opening.greeting       || (isFr ? "Bonjour, commençons." : "Hello, let's get started.");
    const first_question = opening.first_question || (isFr ? "Parlez-moi de votre expérience." : "Tell me about your experience.");
    const question_type  = opening.question_type  || "Technical";
    const hint           = opening.hint           || "";

    return NextResponse.json({
      greeting,
      first_question,
      question_type,
      hint,
      speak_text:      `${greeting} ${first_question}`.trim(),
      audio_b64:       null,
      use_browser_tts: true,
      total_turns,
      turn_number:     1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/start] Groq error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
