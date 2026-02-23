import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby limits if dealing with longer CVs

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
        }

        const { data: cv, error: dbError } = await supabase
            .from("cvs")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ detail: "Groq API key is not configured" }, { status: 500 });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        let rawText = cv.extracted_cv?.raw_text || "";
        if (!rawText) {
            rawText = JSON.stringify(cv.extracted_cv || {}, null, 2);
        }

        const analysisResult = cv.analysis_result || {};

        const systemPrompt = `You are a senior CV reviewer and career advisor with expertise across all industries.
Your job is to review the candidate's CV and provide specific, actionable feedback.
Rules:
- Base ALL suggestions on the actual CV content provided
- Be specific: reference actual companies, roles, skills mentioned in the CV
- Identify missing elements that would strengthen the CV for their field
- Suggest improvements to formatting, wording, and structure
- Point out weak sections that need more detail or better presentation
- Do NOT hallucinate experience or skills not present in the CV
- Make recommendations tailored to the candidate's industry/field`;

        const userPrompt = `=== CV CONTENT ===
${rawText}

=== ANALYSIS METRICS ===
Score: ${analysisResult.score || 'N/A'}/100
Readability: ${analysisResult.readability_score || 'N/A'}
Grade Level: ${analysisResult.grade_level || 'N/A'}

Based on this CV, provide comprehensive feedback:
1. **key_weaknesses**: List 3-5 specific weaknesses (e.g., 'Missing quantifiable achievements in work experience')
2. **improvements**: List 3-5 actionable improvements (e.g., 'Add metrics to your [specific role] responsibilities')
3. **missing_elements**: What's missing that would strengthen this CV (e.g., 'Professional summary', 'Certifications')
4. **section_changes**: Specific changes for each section (Education, Experience, Skills, etc.)
5. **overall_score**: Output an overall quality score out of 100 based on modern ATS resume standards.

Return a JSON object with these exact keys: 'key_weaknesses', 'improvements', 'missing_elements', 'section_changes', 'overall_score'`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            response_format: { type: "json_object" },
            max_tokens: 4000,
        });

        const content = chatCompletion.choices[0]?.message?.content?.trim();
        if (!content) {
            throw new Error("Empty response from Groq");
        }

        const suggestions = JSON.parse(content);

        const updatedAnalysis = {
            ...analysisResult,
            score: suggestions.overall_score || analysisResult.score || 60,
        };

        const { data: updatedCv, error: updateError } = await supabase
            .from("cvs")
            .update({
                suggestions: suggestions,
                analysis_result: updatedAnalysis,
                score: updatedAnalysis.score,
                analyzed_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError || !updatedCv) {
            console.error("DB Update failed:", updateError);
            return NextResponse.json({ detail: "Failed to save analysis" }, { status: 500 });
        }

        return NextResponse.json(updatedCv, { status: 200 });

    } catch (error: any) {
        console.error("Analyze CV handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
