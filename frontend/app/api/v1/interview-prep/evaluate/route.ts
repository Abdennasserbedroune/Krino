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

// Words/patterns that indicate a non-serious answer
const JUNK_PATTERNS = [
  /^(lol+|lmao|haha|hehe|idk|ok|okay|yes|no|nope|yep|sure|hmm+|ugh+|meh|wtf|omg|😂|🤣|\.+|\?+|!+|test|hi|hello|bye|whatever|idc|asdf|qwerty|1234|fuck|shit|dunno|nothing|none|n\/a)$/i,
  /^(.{1,4})$/, // answers under 5 chars
];

function isJunkAnswer(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  return JUNK_PATTERNS.some(p => p.test(trimmed));
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
      temperature: 0.1,
      max_tokens:  700,
      // Disable extended thinking / reasoning mode
      reasoning: { effort: "none" },
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

    const body = (await req.json()) as EvaluateBody;
    const { question, answer, job_title, question_type } = body;

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ detail: "question and answer are required." }, { status: 400 });
    }
    if (answer.trim().length < 15) {
      return NextResponse.json({ detail: "Your answer is too short to evaluate. Please write a proper response." }, { status: 400 });
    }

    // Hard gate: reject junk/joke answers server-side before hitting the model
    if (isJunkAnswer(answer)) {
      return NextResponse.json({
        evaluation: {
          score: 0,
          verdict: "Insufficient",
          what_was_good: "No substantive answer was provided.",
          what_was_missing: "A real, thoughtful response that addresses the question directly. Joke or filler answers score 0 and waste your prep time.",
          ideal_answer_summary: "Please write a genuine answer to get useful feedback. Even a rough attempt is better than nothing — the AI will guide you from there.",
        },
      }, { status: 200 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ detail: "OpenRouter API key not configured." }, { status: 500 });

    const systemPrompt = [
      "You are a senior technical interviewer evaluating a candidate's answer. Be direct, honest, and specific — like a mentor who wants the candidate to genuinely improve.",
      "",
      "STRICT EVALUATION RULES:",
      "1. Evaluate ONLY what the candidate actually wrote. Never reward what they did NOT say.",
      "2. If the answer is gibberish, irrelevant, a joke, or clearly not serious: score it 0, verdict = Insufficient. Do not pretend it has merit.",
      "3. If the answer is vague or off-topic but shows some effort: score 10-30, explain what was missing.",
      "4. Technical/Coding: check correctness, depth, edge cases, efficiency awareness.",
      "5. Behavioral: check STAR structure, specificity, real measurable impact.",
      "6. System Design: check scope, trade-offs, scalability reasoning, component breakdown.",
      "7. Score calibration: 90-100 = genuinely impressive and complete; 70-89 = good with minor gaps; 50-69 = passable but weak; 30-49 = incomplete; <30 = insufficient.",
      "8. Output ONLY a raw JSON object. No markdown, no text outside the JSON.",
    ].join("\n");

    const userPrompt = [
      `Role: ${(job_title || "Software Engineer").trim()}`,
      `Question type: ${(question_type || "Technical").trim()}`,
      "",
      `QUESTION: ${question.trim()}`,
      "",
      `CANDIDATE ANSWER: ${answer.trim()}`,
      "",
      'Return JSON: { "score": 0-100, "verdict": "Excellent|Good|Needs Work|Insufficient", "what_was_good": "specific praise or N/A if none", "what_was_missing": "specific gaps", "ideal_answer_summary": "2-3 sentences on the ideal answer" }',
    ].join("\n");

    let result = await callOpenRouter(apiKey, PRIMARY_MODEL, systemPrompt, userPrompt);

    if (!result.ok) {
      console.error(`[evaluate] Primary failed [${result.status}]:`, result.text.slice(0, 300));
      result = await callOpenRouter(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt);
    }

    if (!result.ok) {
      console.error(`[evaluate] Fallback also failed [${result.status}]:`, result.text.slice(0, 300));
      return NextResponse.json({ detail: `AI error (${result.status}). Please try again.` }, { status: 502 });
    }

    let parsed: { choices?: { message?: { content?: string } }[] };
    try { parsed = JSON.parse(result.text); }
    catch {
      return NextResponse.json({ detail: "Unexpected AI response. Please try again." }, { status: 500 });
    }

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
