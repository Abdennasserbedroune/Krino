import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const PRIMARY_MODEL  = "nvidia/nemotron-3-super-120b-a12b:free";
const FALLBACK_MODEL = "z-ai/glm-4.5-air:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface GenerateBody {
  job_title: string;
  company_name: string;
  job_field: string;
  experience_level: string;
  tech_stack?: string;
  extra_context?: string;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ ok: boolean; text: string; status: number }> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://pathwise-liart.vercel.app",
      "X-Title":       "Krino Interview Prep",
    },
    body: JSON.stringify({
      model,
      messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.2,
      max_tokens:  2500,
      // Disable extended thinking / reasoning mode — speeds up response massively
      reasoning: { effort: "none" },
      // OpenRouter extra: disable thinking for models that support it
      extra_body: { thinking: { type: "disabled" } },
    }),
  });
  const text = await res.text();
  return { ok: res.ok, text, status: res.status };
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
      ? `The company is "${company_name.trim()}". Use your knowledge of this company (tech stack, products, engineering culture, scale challenges) to write questions that feel specifically tailored to them.`
      : "No specific company provided. Focus on the role and field rigorously.";

    const techCtx  = body.tech_stack?.trim()   ? `Candidate\'s tech stack: "${body.tech_stack.trim()}". Frame technical questions around these tools.` : "";
    const extraCtx = body.extra_context?.trim() ? `Extra context: "${body.extra_context.trim()}"` : "";

    const systemPrompt = [
      "You are a senior technical interviewer at a top-tier tech company generating 10 interview questions.",
      "",
      "STRICT RULES — violating any rule makes the output useless:",
      "1. ZERO generic questions. Never write: 'Tell me about yourself', 'What are your strengths/weaknesses', 'Where do you see yourself in 5 years', or any HR filler.",
      "2. Every question must be scenario-based, technical, or case-study — rooted in real on-the-job challenges.",
      "3. Engineering roles: include coding/algorithm, system design, debugging, and architecture trade-off questions.",
      "4. Non-engineering roles: include domain KPIs, case studies, process design, and metrics-driven decisions.",
      `5. Calibrate to experience: Junior = fundamentals + implementation; Mid = trade-offs + ownership; Senior = architecture + leadership + ambiguity.`,
      `6. ${companyCtx}`,
      "7. Output ONLY a raw JSON array of exactly 10 objects. No markdown fences, no commentary, no text before or after the JSON.",
      "",
      "Each object: { \"id\": 1-10, \"question\": string, \"type\": \"Technical|System Design|Behavioral|Case Study|Coding\", \"difficulty\": \"Easy|Medium|Hard\", \"hint\": \"1 sentence on what a strong answer must cover\" }",
    ].join("\n");

    const userPrompt = [
      `Role: ${job_title.trim()}`,
      `Field: ${job_field.trim()}`,
      `Experience Level: ${experience_level.trim()}`,
      techCtx,
      extraCtx,
      "",
      "Generate the 10 questions as a JSON array now.",
    ].filter(Boolean).join("\n");

    // Try primary, fall back automatically
    let result = await callOpenRouter(apiKey, PRIMARY_MODEL, systemPrompt, userPrompt);

    if (!result.ok) {
      console.error(`[generate] Primary failed [${result.status}]:`, result.text.slice(0, 300));
      result = await callOpenRouter(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt);
    }

    if (!result.ok) {
      console.error(`[generate] Fallback also failed [${result.status}]:`, result.text.slice(0, 300));
      return NextResponse.json({ detail: `AI error (${result.status}). Please try again.` }, { status: 502 });
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try { parsed = JSON.parse(result.text); }
    catch {
      console.error("[generate] Could not parse OpenRouter envelope:", result.text.slice(0, 300));
      return NextResponse.json({ detail: "Unexpected AI response format. Please try again." }, { status: 500 });
    }

    const raw = parsed?.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      console.error("[generate] Empty content. Full response:", result.text.slice(0, 500));
      return NextResponse.json({ detail: "Model returned empty response. Please try again." }, { status: 500 });
    }

    // Strip markdown fences if model ignores the no-fence rule
    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();

    let questions: unknown[];
    try {
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch {
      console.error("[generate] JSON parse failed. Raw content:", raw.slice(0, 400));
      return NextResponse.json({ detail: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
