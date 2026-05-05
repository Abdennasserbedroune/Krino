import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MODEL        = "openai/gpt-oss-120b:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS   = 45_000;

interface EvaluateBody {
  question:      string;
  answer:        string;
  job_title:     string;
  question_type: string;
}

const JUNK_PATTERNS = [
  /^(lol+|lmao|haha|hehe|idk|ok|okay|yes|no|nope|yep|sure|hmm+|ugh+|meh|wtf|omg|test|hi|hello|bye|whatever|idc|asdf|qwerty|1234|dunno|nothing|none|n\/a)$/i,
  /^[^a-zA-Z0-9]{1,10}$/,
  /^.{1,9}$/,
];

function isJunkAnswer(answer: string): boolean {
  const t = answer.trim().toLowerCase();
  const deduped = [...new Set(t.split(/\s+/))].join(" ");
  return JUNK_PATTERNS.some(p => p.test(t)) || JUNK_PATTERNS.some(p => p.test(deduped));
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
    if (answer.trim().length < 15) {
      return NextResponse.json({ detail: "Your answer is too short. Please write a proper response." }, { status: 400 });
    }

    if (isJunkAnswer(answer)) {
      return NextResponse.json({
        evaluation: {
          score: 0,
          verdict: "Insufficient",
          what_was_good: "N/A — no substantive answer was provided.",
          what_was_missing: "A real, thoughtful response that addresses the question. Joke or filler answers score 0.",
          ideal_answer_summary: "Write a genuine attempt and the AI will give you specific, useful feedback to improve.",
        },
      }, { status: 200 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ detail: "OpenRouter API key not configured." }, { status: 500 });

    const systemPrompt = [
      "You are a senior technical interviewer evaluating a candidate answer. Be direct, honest, specific.",
      "",
      "RULES:",
      "1. Evaluate ONLY what the candidate wrote. Never credit knowledge they did not demonstrate.",
      "2. Gibberish, jokes, irrelevant or non-answers = score 0, verdict Insufficient. No exceptions.",
      "3. Vague but genuine effort = 10-35, explain gaps.",
      "4. Technical/Coding: correctness, depth, edge cases, efficiency.",
      "5. Behavioral: STAR structure, specificity, measurable impact.",
      "6. System Design: scope, trade-offs, scalability, components.",
      "7. Score: 90-100 impressive; 70-89 good; 50-69 passable; 30-49 incomplete; <30 insufficient.",
      "8. Output ONLY a raw JSON object. No markdown, no extra text.",
    ].join("\n");

    const userPrompt = [
      `Role: ${(job_title || "Software Engineer").trim()}`,
      `Question type: ${(question_type || "Technical").trim()}`,
      "",
      `QUESTION: ${question.trim()}`,
      "",
      `CANDIDATE ANSWER: ${answer.trim()}`,
      "",
      'Return JSON: { "score": 0-100, "verdict": "Excellent|Good|Needs Work|Insufficient", "what_was_good": "specific or N/A", "what_was_missing": "specific gaps", "ideal_answer_summary": "2-3 sentences" }',
    ].join("\n");

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
          temperature: 0.1,
          max_tokens:  600,
        }),
      });
      responseText   = await res.text();
      responseOk     = res.ok;
      responseStatus = res.status;
    } catch (err) {
      const isTimeout = (err as Error)?.name === "AbortError";
      console.error(`[evaluate] ${isTimeout ? "TIMED OUT" : "fetch error"}:`, (err as Error).message);
      return NextResponse.json(
        { detail: isTimeout ? "AI is taking too long. Please try again." : "Network error. Please try again." },
        { status: 504 },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!responseOk) {
      console.error(`[evaluate] OpenRouter error [${responseStatus}]:`, responseText.slice(0, 300));
      return NextResponse.json({ detail: `AI error (${responseStatus}). Please try again.` }, { status: 502 });
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try { parsed = JSON.parse(responseText); }
    catch { return NextResponse.json({ detail: "Unexpected AI response. Please try again." }, { status: 500 }); }

    const raw     = parsed?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();

    let evaluation: unknown;
    try { evaluation = JSON.parse(cleaned); }
    catch {
      console.error("[evaluate] JSON parse failed. Raw:", raw.slice(0, 300));
      return NextResponse.json({ detail: "Failed to parse AI evaluation. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ evaluation }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[evaluate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
