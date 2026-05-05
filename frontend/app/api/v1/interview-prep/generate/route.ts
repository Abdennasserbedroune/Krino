import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "qwen/qwen3-32b";

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

    const level = experience_level.trim().toLowerCase();
    const isJunior = level.includes("junior") || level.includes("entry");
    const isSenior = level.includes("senior") || level.includes("lead") || level.includes("staff") || level.includes("principal");
    const isMid    = !isJunior && !isSenior;

    const companyCtx = company_name?.trim()
      ? `The target company is "${company_name.trim()}". You know this company's real tech stack, engineering culture, scale, products, and known engineering challenges. Every question must feel like it was written specifically for an interview at THIS company — reference their domain, their scale, their known problems where relevant.`
      : "No specific company. Make questions deeply role-specific and field-specific.";

    const techCtx = body.tech_stack?.trim()
      ? `The candidate's tech stack is: ${body.tech_stack.trim()}. At least 3 questions must directly involve one or more of these specific technologies — including bugs, edge cases, or design decisions around them.`
      : "";

    const extraCtx = body.extra_context?.trim()
      ? `Extra context about the role or candidate: ${body.extra_context.trim()}. Use this to make questions more targeted.`
      : "";

    // Level-specific question mix
    const levelRules = isJunior ? [
      "Mix: 3 coding/algorithm (implement or fix a bug in a short snippet), 2 technical concept questions, 2 debugging scenarios, 2 behavioral (specific past experience), 1 system design (small scale).",
      "Difficulty: mostly Easy-Medium. No architecture or leadership questions.",
      "Coding questions: provide a short broken code snippet (5-15 lines) and ask the candidate to find the bug or complete the function.",
    ] : isMid ? [
      "Mix: 2 coding (find the bug or optimize a real snippet), 2 system design (medium scale trade-offs), 2 technical depth (why X over Y, edge cases, internals), 2 behavioral (ownership, conflict, delivery), 1 debugging scenario, 1 domain case study.",
      "Difficulty: Medium-Hard. Questions must require real experience to answer well.",
      "Coding questions: include a real broken or inefficient snippet (10-20 lines) and ask to fix, optimize, or explain the issue and its production impact.",
      "System design: require concrete components, trade-offs, and failure modes — not a vague 'design X'.",
    ] : [
      "Mix: 1 hard coding (complex bug or algorithm with edge cases), 2 advanced system design (large scale, distributed systems, failure handling), 2 architecture decisions (trade-offs, when to use X vs Y at scale), 2 leadership/ownership (handling ambiguity, cross-team, incidents), 2 domain expertise (deep technical knowledge of the field), 1 behavioral (hardest technical decision made).",
      "Difficulty: Hard. Every question should make a junior or mid-level candidate struggle.",
      "Coding questions: provide a non-trivial snippet with a subtle bug (race condition, memory leak, off-by-one in concurrent code, etc.) and ask to identify, explain, and fix it with production implications.",
      "System design: demand specific numbers, CAP theorem awareness, consistency models, and failure recovery strategies.",
      "Architecture: ask about real decisions like 'when would you NOT use microservices' or 'how would you handle 10M concurrent WebSocket connections'.",
    ];

    const systemPrompt = [
      `You are a principal engineer and technical interviewer at a top-tier tech company conducting a ${experience_level.trim()} level interview.`,
      "",
      "YOUR JOB: Generate 10 interview questions that would genuinely challenge a real candidate at this level. Not textbook questions — real ones that separate good candidates from great ones.",
      "",
      "ABSOLUTE RULES:",
      "1. ZERO generic or HR questions. No 'tell me about yourself', no 'what are your strengths', no 'where do you see yourself'. These are an automatic failure.",
      "2. Coding questions MUST include an actual code snippet (broken, inefficient, or incomplete) inside the question text itself. The snippet must be realistic — not pseudo-code.",
      "3. Every question must be specific enough that a vague answer is clearly wrong. Include enough context that the candidate knows exactly what they're being asked.",
      "4. System design questions must specify scale, constraints, or a failure scenario — never just 'design X'.",
      "5. Behavioral questions must ask about a SPECIFIC past situation, not hypotheticals.",
      `6. ${companyCtx}`,
      techCtx ? `7. ${techCtx}` : "7. Make questions technically deep for the field.",
      extraCtx ? `8. ${extraCtx}` : "",
      "",
      "QUESTION MIX FOR THIS LEVEL:",
      ...levelRules,
      "",
      "OUTPUT FORMAT: A raw JSON array of exactly 10 objects. No markdown fences, no text before or after.",
      "Schema: { \"id\": 1-10, \"question\": string (include code snippet inline if applicable, use \\n for newlines), \"type\": \"Technical|System Design|Behavioral|Case Study|Coding\", \"difficulty\": \"Easy|Medium|Hard\", \"hint\": \"1 sentence on what a strong answer must cover\" }",
    ].filter(Boolean).join("\n");

    const userPrompt = [
      `Role: ${job_title.trim()}`,
      `Field: ${job_field.trim()}`,
      `Experience Level: ${experience_level.trim()}`,
      techCtx ? `Tech Stack: ${body.tech_stack!.trim()}` : "",
      extraCtx ? `Extra: ${body.extra_context!.trim()}` : "",
      company_name?.trim() ? `Company: ${company_name.trim()}` : "",
      "",
      "Generate the 10 questions now. Include real code snippets where required. Output only the JSON array.",
    ].filter(Boolean).join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature:     0.3,
      response_format: { type: "json_object" },
      max_tokens:      3000,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) {
      console.error("[generate] Empty content from Groq");
      return NextResponse.json({ detail: "Model returned empty response. Please try again." }, { status: 500 });
    }

    let questions: unknown[];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (Array.isArray(parsed?.questions)) {
        questions = parsed.questions;
      } else {
        const arr = Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v));
        if (arr) { questions = arr as unknown[]; }
        else { throw new Error("No array found in response"); }
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
