import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "qwen-qwen3-32b";

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

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

    const companyCtx = company_name?.trim()
      ? `The company is "${company_name.trim()}". Use your knowledge of this company (tech stack, products, culture, scale challenges) to write questions tailored to them.`
      : "No specific company provided. Focus on the role and field rigorously.";

    const techCtx  = body.tech_stack?.trim()   ? `Candidate's tech stack: "${body.tech_stack.trim()}". Frame questions around these tools.` : "";
    const extraCtx = body.extra_context?.trim() ? `Extra context: "${body.extra_context.trim()}"` : "";

    const systemPrompt = [
      "You are a senior technical interviewer. Generate 10 interview questions immediately.",
      "",
      "RULES:",
      "1. NO generic questions (no 'Tell me about yourself', no strengths/weaknesses, no HR filler).",
      "2. Every question must be scenario-based, technical, or case-study rooted in real job challenges.",
      "3. Engineering: include coding/algorithm, system design, debugging, architecture trade-offs.",
      "4. Non-engineering: include KPIs, case studies, process design, metrics-driven decisions.",
      "5. Calibrate to level: Junior = fundamentals; Mid = trade-offs + ownership; Senior = architecture + leadership.",
      `6. ${companyCtx}`,
      "7. Output ONLY a raw JSON array of exactly 10 objects. No markdown, no text outside the JSON.",
      "",
      "Schema: { \"id\": 1-10, \"question\": string, \"type\": \"Technical|System Design|Behavioral|Case Study|Coding\", \"difficulty\": \"Easy|Medium|Hard\", \"hint\": string }",
    ].join("\n");

    const userPrompt = [
      `Role: ${job_title.trim()}`,
      `Field: ${job_field.trim()}`,
      `Experience Level: ${experience_level.trim()}`,
      techCtx,
      extraCtx,
      "",
      "Output the JSON array now.",
    ].filter(Boolean).join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature:     0.2,
      response_format: { type: "json_object" },
      max_tokens:      2000,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) {
      console.error("[generate] Empty content from Groq");
      return NextResponse.json({ detail: "Model returned empty response. Please try again." }, { status: 500 });
    }

    // Groq json_object mode may return { questions: [...] } or a raw array
    let questions: unknown[];
    try {
      const parsed = JSON.parse(raw);
      // Handle both { questions: [...] } and direct array
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (Array.isArray(parsed?.questions)) {
        questions = parsed.questions;
      } else {
        // Try to find any array value in the top-level object
        const arr = Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v));
        if (arr) {
          questions = arr as unknown[];
        } else {
          throw new Error("No array found in response");
        }
      }
    } catch {
      console.error("[generate] JSON parse failed. Raw:", raw.slice(0, 400));
      return NextResponse.json({ detail: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
