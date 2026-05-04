import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const OPENROUTER_MODEL = "nvidia/nemotron-super-49b-v1:free";
const OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions";

interface GenerateBody {
  job_title: string;
  company_name: string;
  job_field: string;
  experience_level: string;
  tech_stack?: string;
  extra_context?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as GenerateBody;

    const { job_title, company_name, job_field, experience_level } = body;
    if (!job_title?.trim() || !job_field?.trim() || !experience_level?.trim()) {
      return NextResponse.json({ detail: "job_title, job_field, and experience_level are required." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ detail: "OpenRouter API key not configured." }, { status: 500 });

    const companyCtx = company_name?.trim()
      ? `The company is "${company_name.trim()}". If you know this company (products, tech stack, engineering culture, interview style), use that knowledge to make questions feel tailored to them specifically — mention their known tools, scale challenges, or domain if relevant.`
      : "No specific company was provided. Focus on the role and field generically but keep questions rigorous.";

    const techCtx = body.tech_stack?.trim()
      ? `The candidate mentioned this tech stack or context: "${body.tech_stack.trim()}". Use it to frame technical questions.`
      : "";

    const extraCtx = body.extra_context?.trim()
      ? `Additional context from the candidate: "${body.extra_context.trim()}"`
      : "";

    const systemPrompt = `You are a senior technical interviewer at a top-tier tech company. 
Your job is to generate 10 hard, specific, role-appropriate interview questions.

CRITICAL RULES:
1. NEVER write generic questions like "Tell me about yourself" or "What are your strengths?".
2. Every question must be technical, scenario-based, or behavioral-technical — grounded in real job challenges.
3. For engineering roles: include algorithm/data structure questions, system design, debugging scenarios, or architecture trade-offs.
4. For non-engineering roles: include domain-specific case studies, metrics-driven scenarios, or process design questions.
5. Tailor depth to the experience level: Junior = fundamentals + practical; Mid = design trade-offs + ownership; Senior = architecture + leadership + ambiguity.
6. ${companyCtx}
7. Return ONLY a valid JSON array of exactly 10 objects. No markdown, no explanation outside the JSON.

Each object must have exactly these keys:
- "id": number 1–10
- "question": string (the full question)
- "type": one of "Technical" | "System Design" | "Behavioral" | "Case Study" | "Coding"
- "difficulty": one of "Easy" | "Medium" | "Hard"
- "hint": string (1 sentence hint on what a strong answer covers — shown AFTER the candidate answers)`;

    const userPrompt =
      `Role: ${job_title.trim()}\n` +
      `Field: ${job_field.trim()}\n` +
      `Experience Level: ${experience_level.trim()}\n` +
      (techCtx  ? techCtx  + "\n" : "") +
      (extraCtx ? extraCtx + "\n" : "") +
      `\nGenerate 10 interview questions as a JSON array.`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://krino.vercel.app",
        "X-Title":       "Krino Interview Prep",
      },
      body: JSON.stringify({
        model:       OPENROUTER_MODEL,
        messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.2,
        max_tokens:  3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[interview-prep/generate] OpenRouter error:", errText);
      return NextResponse.json({ detail: "AI model request failed. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const raw  = data?.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if model wraps in ```json
    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();

    let questions: unknown[];
    try {
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch {
      console.error("[interview-prep/generate] JSON parse failed. Raw:", raw.slice(0, 300));
      return NextResponse.json({ detail: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[interview-prep/generate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
