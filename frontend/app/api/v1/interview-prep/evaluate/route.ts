import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const PRIMARY_MODEL  = "nvidia/nemotron-3-super-120b-a12b:free";
const FALLBACK_MODEL = "z-ai/glm-4.5-air:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface EvaluateBody {
  question:      string;
  answer:        string;
  job_title:     string;
  question_type: string;
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
      temperature: 0.15,
      max_tokens:  800,
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

    const body = (await req.json()) as EvaluateBody;
    const { question, answer, job_title, question_type } = body;

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ detail: "question and answer are required." }, { status: 400 });
    }
    if (answer.trim().length < 10) {
      return NextResponse.json({ detail: "Answer is too short to evaluate." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ detail: "OpenRouter API key not configured." }, { status: 500 });

    const systemPrompt =
      "You are a senior technical interviewer evaluating a candidate's answer. Be direct, specific, and honest — like a mentor who wants the candidate to improve.\n\n" +
      "RULES:\n" +
      "1. Base your evaluation only on what the candidate wrote — don't assume knowledge they didn't show.\n" +
      "2. For technical/coding questions: check correctness, depth, edge cases, and efficiency awareness.\n" +
      "3. For behavioral questions: check STAR structure, specificity, and real impact demonstrated.\n" +
      "4. For system design: check scope, trade-offs, scalability awareness, and component reasoning.\n" +
      "5. Score from 0-100. Be calibrated: 90+ means genuinely impressive, 50-70 means passable but weak, <40 means likely to fail.\n" +
      "6. Return ONLY a valid JSON object — no markdown, no text outside the JSON.";

    const userPrompt =
      `Role being interviewed for: ${(job_title || "Software Engineer").trim()}\n` +
      `Question type: ${(question_type || "Technical").trim()}\n\n` +
      `QUESTION:\n${question.trim()}\n\n` +
      `CANDIDATE'S ANSWER:\n${answer.trim()}\n\n` +
      "Return a JSON object with exactly these keys:\n" +
      "{\n" +
      '  "score": integer 0-100,\n' +
      '  "verdict": "one of: Excellent | Good | Needs Work | Insufficient",\n' +
      '  "what_was_good": "1-2 sentences on what they got right — cite their words",\n' +
      '  "what_was_missing": "1-2 sentences on what a strong answer would include that was absent or weak",\n' +
      '  "ideal_answer_summary": "2-3 sentences: what the ideal answer looks like for this specific question"\n' +
      "}";

    // ── Try primary, fall back if it fails ─────────────────────────────────
    let result = await callOpenRouter(apiKey, PRIMARY_MODEL, systemPrompt, userPrompt);

    if (!result.ok) {
      console.error(`[interview-prep/evaluate] Primary model (${PRIMARY_MODEL}) failed [${result.status}]:`, result.text);
      console.log(`[interview-prep/evaluate] Trying fallback: ${FALLBACK_MODEL}`);
      result = await callOpenRouter(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt);
    }

    if (!result.ok) {
      console.error(`[interview-prep/evaluate] Fallback also failed [${result.status}]:`, result.text);
      return NextResponse.json(
        { detail: `AI evaluation error (${result.status}): ${result.text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try { parsed = JSON.parse(result.text); } catch {
      return NextResponse.json({ detail: "Unexpected response from AI. Please try again." }, { status: 500 });
    }

    const raw     = parsed?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();

    let evaluation: unknown;
    try {
      evaluation = JSON.parse(cleaned);
    } catch {
      console.error("[interview-prep/evaluate] JSON parse failed. Raw:", raw.slice(0, 300));
      return NextResponse.json({ detail: "Failed to parse AI evaluation. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ evaluation }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[interview-prep/evaluate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
