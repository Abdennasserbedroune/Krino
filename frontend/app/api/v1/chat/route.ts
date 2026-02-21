import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60; // Allow enough time for LLM response

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { cv_id, messages } = body;

        if (!cv_id || !messages || !Array.isArray(messages)) {
            return NextResponse.json({ detail: "Missing cv_id or messages array" }, { status: 400 });
        }

        const id = parseInt(cv_id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
        }

        // Fetch the CV context
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

        // Build CV Context String (Mirroring Python _build_cv_context)
        const contextParts: string[] = [];

        if (cv.extracted_cv) {
            contextParts.push("=== CV CONTENT ===");
            const rawText = cv.extracted_cv?.raw_text || JSON.stringify(cv.extracted_cv, null, 2);
            contextParts.push(rawText);
        }

        if (cv.analysis_result) {
            contextParts.push("\n=== CV ANALYSIS ===");
            contextParts.push(`Overall Score: ${cv.score || 'N/A'}/100`);
            contextParts.push(`Readability Score: ${cv.analysis_result.readability_score || 'N/A'}`);
            if (cv.analysis_result.grade_level) {
                contextParts.push(`Grade Level: ${cv.analysis_result.grade_level}`);
            }
        }

        if (cv.structured_data && !cv.extracted_cv) {
            contextParts.push("\n=== STRUCTURED DATA ===");
            contextParts.push(JSON.stringify(cv.structured_data, null, 2).substring(0, 2000));
        }

        if (contextParts.length === 0) {
            contextParts.push("No CV data available.");
        }

        const cvSummary = contextParts.join("\n");
        const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

        const systemPrompt = `You are an expert career advisor and CV consultant with deep knowledge across all industries. 
Your role is to provide personalized, actionable feedback based on the user's actual CV data.

Guidelines:
1. Use the CV information provided to give specific advice about their skills, experience, and career field
2. Ask insightful questions about their career goals, target roles, and industry preferences
3. Provide constructive criticism on weak sections or missing elements in their CV
4. Suggest improvements tailored to their field (e.g., tech, marketing, finance, etc.)
5. Be encouraging but honest - point out both strengths and areas for improvement
6. Reference specific details from their CV (skills, company names, education) to show you understand their background
7. Keep responses concise and conversational (2-4 sentences unless asked for detailed advice)

Remember: Base ALL your advice on the actual CV data provided.`;

        const userPrompt = `=== USER'S CV INFORMATION ===
${cvSummary}

=== CONVERSATION HISTORY ===
${history}

Based on the CV information above and the conversation history, provide a helpful, specific response to the user's latest message. Reference their actual skills, experience, or education when relevant.`;

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 1000,
        });

        let reply = chatCompletion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't process your request at the moment.";

        // Remove markdown block quotes if present exactly matching Python behavior
        if (reply.startsWith("```")) {
            reply = reply.replace(/^```|```$/g, "").trim();
        }

        return NextResponse.json({ reply: reply }, { status: 200 });

    } catch (error: any) {
        console.error("Chat handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
