import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MODEL        = "openai/gpt-oss-120b:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS   = 50_000;

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let responseText: string;
    let responseOk: boolean;
    let responseStatus: number;

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type":  "application/json",
          "HTTP-Referer":  "https://pathwise-liart.vercel.app",
          "X-Title":       "Krino Interview Prep",
        },
        body: JSON.stringify({
          model:       MODEL,
          messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.2,
          max_tokens:  2000,
        }),
      });
      responseText   = await res.text();
      responseOk     = res.ok;
      responseStatus = res.status;
    } catch (err) {
      const isTimeout = (err as Error)?.name === "AbortError";
      console.error(`[generate] ${isTimeout ? "TIMED OUT after 50s" : "fetch error"}:`, (err as Error).message);
      return NextResponse.json(
        { detail: isTimeout ? "AI is taking too long. Please try again." : "Network error reaching AI. Please try again." },
        { status: 504 },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!responseOk) {
      console.error(`[generate] OpenRouter error [${responseStatus}]:`, responseText.slice(0, 300));
      return NextResponse.json({ detail: `AI error (${responseStatus}). Please try again.` }, { status: 502 });
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try { parsed = JSON.parse(responseText); }
    catch {
      console.error("[generate] Envelope parse failed:", responseText.slice(0, 200));
      return NextResponse.json({ detail: "Unexpected AI response. Please try again." }, { status: 500 });
    }

    const raw = parsed?.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      console.error("[generate] Empty content:", responseText.slice(0, 400));
      return NextResponse.json({ detail: "Model returned empty response. Please try again." }, { status: 500 });
    }

    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();

    let questions: unknown[];
    try {
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch {
      console.error("[generate] Questions parse failed. Raw:", raw.slice(0, 400));
      return NextResponse.json({ detail: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
