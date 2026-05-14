/**
 * POST /api/cv-builder/drafts/:id/ats-score
 * Runs real ATS analysis on the draft using Groq.
 * Returns { score, breakdown } and persists ats_score on the row.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { data: draft, error: dbError } = await supabase
      .from("cv_builder_drafts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (dbError || !draft) return NextResponse.json({ detail: "Draft not found" }, { status: 404 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const cvData = draft.data ?? {};
    const cvText = JSON.stringify(cvData, null, 2);

    const systemPrompt = `You are a strict ATS (Applicant Tracking System) evaluator.
Score the CV on the following criteria and return ONLY valid JSON.
Criteria:
- contact_info: Has name, email, phone, location (0-15)
- summary: Has a professional summary or objective (0-10)
- experience: Clear job titles, companies, dates, quantified achievements (0-25)
- education: Degree, institution, dates present (0-15)
- skills: Relevant keywords/skills listed (0-20)
- formatting: Clean structure, no tables/graphics that confuse ATS, section headers clear (0-15)
Return JSON with keys: contact_info, summary, experience, education, skills, formatting, total (sum 0-100), tips (array of 3 specific improvement tips).`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Score this CV:\n${cvText}` },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from Groq");

    const result = JSON.parse(content);
    const score = Math.min(100, Math.max(0, result.total ?? 0));

    // Persist the score
    await supabase
      .from("cv_builder_drafts")
      .update({ ats_score: score, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      score,
      breakdown: {
        contact_info: result.contact_info ?? 0,
        summary: result.summary ?? 0,
        experience: result.experience ?? 0,
        education: result.education ?? 0,
        skills: result.skills ?? 0,
        formatting: result.formatting ?? 0,
      },
      tips: result.tips ?? [],
    }, { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/ats-score POST]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
