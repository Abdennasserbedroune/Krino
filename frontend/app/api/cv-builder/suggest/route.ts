/**
 * POST /api/cv-builder/suggest
 * AI-powered field improvement for any CV section.
 * Body: { draftId, section, field, currentValue, action, jdText? }
 * Returns: { variants: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

/**
 * Groq json_object mode can return variants as an object instead of an array
 * e.g. { "Objective": "...", "About Me": "..." }  →  we normalise to string[].
 */
function normaliseVariants(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v) => typeof v === "string") as string[];
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .filter((v) => typeof v === "string") as string[];
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { draftId, section, field, currentValue, action = "improve", jdText = "" } = body;

    if (!draftId || !section || !field || currentValue === undefined) {
      return NextResponse.json(
        { detail: "draftId, section, field, currentValue are required" },
        { status: 400 }
      );
    }

    // Verify draft ownership
    const { data: draft, error: dbError } = await supabase
      .from("cv_builder_drafts")
      .select("id, data")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !draft)
      return NextResponse.json({ detail: "Draft not found" }, { status: 404 });

    if (!process.env.GROQ_API_KEY)
      return NextResponse.json({ detail: "GROQ_API_KEY not configured" }, { status: 500 });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const actionInstructions: Record<string, string> = {
      improve:  "Rewrite to be more impactful, professional, and results-oriented.",
      shorten:  "Make it concise — keep the core impact but cut filler words and redundancy.",
      expand:   "Expand with more detail, context, and measurable achievements.",
      quantify: "Add specific metrics, numbers, percentages, and measurable outcomes wherever possible.",
      keywords: "Inject relevant ATS-friendly industry keywords and action verbs without making it feel forced.",
      tone:     "Rewrite in a confident, polished, executive-level professional tone.",
      tailor:   jdText
        ? `Tailor specifically for this job description, matching its language and requirements: ${jdText.slice(0, 1000)}`
        : "Tailor to be more industry-relevant and aligned with modern job expectations.",
    };

    const instruction = actionInstructions[action] ?? actionInstructions.improve;

    const systemPrompt = `You are an expert CV and resume writer. Given a CV section value, produce exactly 3 improved variants.
Strict rules:
- Return ONLY a valid JSON object with this exact shape: { "variants": ["variant1", "variant2", "variant3"] }
- variants must be a JSON ARRAY of exactly 3 strings, never an object
- Each variant must be complete and ready to paste into a resume
- Reference only content that is present — never invent companies, roles, or statistics
- Professional tone, no buzzword fluff`;

    const userPrompt = `Section: ${section}
Field: ${field}
Current value: "${String(currentValue).slice(0, 1500)}"
Action: ${instruction}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from Groq");

    const parsed = JSON.parse(content);

    // Normalise: handle both array and object shapes from the LLM
    const variants = normaliseVariants(parsed.variants ?? parsed);

    return NextResponse.json({ variants }, { status: 200 });
  } catch (err: unknown) {
    console.error("[cv-builder/suggest POST]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
