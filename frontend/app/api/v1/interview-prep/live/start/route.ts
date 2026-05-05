import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;
const MODEL = "llama-3.1-8b-instant";

function extractJson(raw: string): Record<string, string> {
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
    const { job_title = "", job_field = "", experience_level = "Mid",
            company_name = "", tech_stack = "", language = "en", total_turns = 5 } = body;

    if (!job_title?.trim() || !job_field?.trim())
      return NextResponse.json({ detail: "job_title and job_field are required." }, { status: 400 });

    const isFr = language === "fr";
    const ctx = [company_name?.trim() && (isFr ? `Entreprise : ${company_name}.` : `Company: ${company_name}.`),
                 tech_stack?.trim()   && (isFr ? `Stack : ${tech_stack}.`        : `Tech stack: ${tech_stack}.`)]
      .filter(Boolean).join(" ");

    const prompt = isFr
      ? `Tu es un interviewer technique humain et chaleureux. Tu conduis un entretien simul\u00e9 pour : ${job_title} (${experience_level}). ${ctx}
Parle naturellement comme un vrai humain \u2014 sois accueillant, d\u00e9tendu mais professionnel.
Accueille le candidat naturellement en une phrase, puis pose ta premi\u00e8re question d'entretien.
R\u00e9ponds UNIQUEMENT avec du JSON valide (pas de markdown) :
{"greeting":"\u2026","first_question":"\u2026","question_type":"Technical","hint":"\u2026"}`
      : `You are a warm, human technical interviewer conducting a simulated interview for: ${job_title} (${experience_level}). ${ctx}
Speak naturally like a real human \u2014 be welcoming, relaxed but professional. Use natural filler like "Alright", "Great", "So" to open.
Greet the candidate naturally in one sentence, then ask your first interview question.
Reply ONLY with valid JSON (no markdown):
{"greeting":"\u2026","first_question":"\u2026","question_type":"Technical","hint":"\u2026"}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resp = await groq.chat.completions.create({
      model: MODEL, messages: [{ role: "user", content: prompt }],
      temperature: 0.7, max_tokens: 512,
    });

    const opening = extractJson(resp.choices[0]?.message?.content ?? "");
    const greeting      = opening.greeting       || (isFr ? "Bonjour, ravi de vous rencontrer." : "Hey, great to meet you!");
    const first_q       = opening.first_question || (isFr ? "Parlez-moi de votre exp\u00e9rience." : "Tell me a bit about yourself and your background.");
    const question_type = opening.question_type  || "Technical";
    const hint          = opening.hint           || "";
    const speak_text    = `${greeting} ${first_q}`.trim();

    const audio_b64 = await synthesise(speak_text);

    return NextResponse.json({
      greeting, first_question: first_q, question_type, hint,
      speak_text, audio_b64, use_browser_tts: !audio_b64,
      total_turns, turn_number: 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/start] error:", msg);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
