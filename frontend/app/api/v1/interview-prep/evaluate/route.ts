import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 30;

const MODEL = "qwen-qwen3-32b";

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

    // Hard gate — instant 0 without calling the model
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

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

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
      "8. Output ONLY a valid JSON object. No markdown, no extra text.",
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

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature:     0.1,
      response_format: { type: "json_object" },
      max_tokens:      600,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) return NextResponse.json({ detail: "Model returned empty response. Please try again." }, { status: 500 });

    let evaluation: unknown;
    try {
      evaluation = JSON.parse(raw);
    } catch {
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
