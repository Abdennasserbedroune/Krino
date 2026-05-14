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

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { draftId, section, field, currentValue, action = "improve", jdText = "" } = body;

    if (!draftId || !section || !field || currentValue === undefined) {
      return NextResponse.json({ detail: "draftId, section, field, currentValue are required" }, { status: 400 });
    }

    // Verify draft ownership
    const { data: draft, error: dbError } = await supabase
      .from("cv_builder_drafts")
      .select("id, data")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !draft) return NextResponse.json({ detail: "Draft not found" }, { status: 404 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const actionInstructions: Record<string, string> = {
      improve: "Rewrite to be more impactful, professional, and results-oriented.",
      tailor: jdText
        ? `Tailor specifically for this job description: ${jdText.slice(0, 800)}`
        : "Tailor to be more industry-relevant.",
      shorten: "Make it concise — keep the impact but cut filler words.",
      expand: "Expand with more detail, context, and measurable achievements.",
    };

    const instruction = actionInstructions[action] ?? actionInstructions.improve;

    const systemPrompt = `You are an expert CV writer. Given a CV field value, produce 3 improved variants.
Rules:
- Each variant must be complete and ready to use
- Reference actual content — never fabricate companies, roles, or stats not present
- Match the tone: professional but not robotic
- Return ONLY valid JSON: { "variants": ["variant1", "variant2", "variant3"] }`;

    const userPrompt = `Section: ${section}\nField: ${field}\nCurrent value: "${currentValue}"\nAction: ${instruction}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from Groq");

    const result = JSON.parse(content);
    return NextResponse.json({ variants: result.variants ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/suggest POST]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
