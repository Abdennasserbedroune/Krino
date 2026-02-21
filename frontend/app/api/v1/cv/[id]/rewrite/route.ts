import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60; // Allow up to 60s for Vercel Hobby limits

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
            .select("id, structured_data, suggestions")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        if (!cv.structured_data || !cv.suggestions) {
            return NextResponse.json({ detail: "CV must be analyzed before rewriting." }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ detail: "Groq API key is not configured" }, { status: 500 });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const systemPrompt = `Rewrite the user's CV using professional language, correct structure, modern formatting, and clear bullet points.
Keep all factual experience. Do not invent anything.`;

        const userPrompt = `Rewrite my CV based on this structured data:
${JSON.stringify(cv.structured_data, null, 2)}

And apply the following improvements:
${JSON.stringify(cv.suggestions, null, 2)}

Return a clean, ready-to-export CV in Markdown format.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 4000,
        });

        const rewrittenContent = chatCompletion.choices[0]?.message?.content?.trim() || "";

        return NextResponse.json({ rewritten_cv: rewrittenContent }, { status: 200 });

    } catch (error: any) {
        console.error("Rewrite CV handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
