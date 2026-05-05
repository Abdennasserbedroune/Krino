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
    const { job_title, job_field, experience_level = "Mid", company_name = "", tech_stack = "", language = "en", total_turns = 5 } = body;

    if (!job_title?.trim() || !job_field?.trim()) {
      return NextResponse.json({ detail: "job_title and job_field are required." }, { status: 400 });
    }

    const isFr = language === "fr";
    const companyCtx = company_name?.trim()
      ? isFr ? `L'entreprise est "${company_name}".` : `The company is "${company_name}".`
      : "";
    const techCtx = tech_stack?.trim()
      ? isFr ? `Stack technique : ${tech_stack}.` : `Tech stack: ${tech_stack}.`
      : "";

    const systemPrompt = isFr
      ? `Tu es un interviewer technique senior. Tu commences un entretien simulé pour le poste de ${job_title} (${experience_level}). ${companyCtx} ${techCtx}
Ton rôle : accueillir brièvement le candidat (1 phrase), puis poser ta première question d'entretien.
Règle absolue : Réponds UNIQUEMENT avec un JSON valide, sans balises markdown.
Format : { "greeting": "<1 phrase d'accueil>", "first_question": "<première question>", "question_type": "Technical|System Design|Behavioral|Coding", "hint": "<1 phrase indice>" }`
      : `You are a senior technical interviewer. You are starting a simulated interview for the role of ${job_title} (${experience_level}). ${companyCtx} ${techCtx}
Your job: greet the candidate briefly (1 sentence), then ask your first interview question.
Absolute rule: Reply ONLY with valid JSON, no markdown fences.
Format: { "greeting": "<1-sentence welcome>", "first_question": "<first question>", "question_type": "Technical|System Design|Behavioral|Coding", "hint": "<1-sentence hint>" }`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const resp = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: isFr ? "Commence l'entretien." : "Start the interview." }],
      temperature: 0.6,
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) return NextResponse.json({ detail: "Empty response from model." }, { status: 500 });

    let opening: Record<string, string>;
    try { opening = JSON.parse(raw); }
    catch { return NextResponse.json({ detail: "Failed to parse model response." }, { status: 500 }); }

    return NextResponse.json({
      greeting:        opening.greeting        ?? "",
      first_question:  opening.first_question  ?? "",
      question_type:   opening.question_type   ?? "Technical",
      hint:            opening.hint            ?? "",
      speak_text:      `${opening.greeting ?? ""} ${opening.first_question ?? ""}`.trim(),
      audio_b64:       null,
      use_browser_tts: true,
      total_turns,
      turn_number:     1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[live/start] error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
