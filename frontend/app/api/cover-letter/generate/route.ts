import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription, tone } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "resumeText and jobDescription are required" },
        { status: 400 }
      );
    }

    const toneInstructions: Record<string, string> = {
      formal:
        "Write in a formal, professional tone suitable for conservative industries like finance, law, or government.",
      confident:
        "Write in a confident, direct tone that highlights achievements with assertive language.",
      creative:
        "Write in a creative, engaging tone with personality, suitable for roles in design, marketing, or startups.",
    };

    const selectedTone = toneInstructions[tone as string] ?? toneInstructions.confident;

    const prompt = `You are an expert career coach and professional writer. Generate a tailored cover letter.

${selectedTone}

Resume:
${resumeText.slice(0, 3000)}

Job Description:
${jobDescription.slice(0, 2000)}

Instructions:
- Keep it to 3-4 paragraphs
- Mention 2-3 specific skills or achievements from the resume that match the JD
- Avoid clichés like "I am writing to express my interest"
- Start with a strong, specific opening sentence
- End with a clear call to action
- Do not include placeholders like [Your Name] or [Date] — write a complete letter body only`;

    // Use the same LLM API key pattern used elsewhere in the project
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Groq API error:", errorBody);
      return NextResponse.json(
        { error: "AI generation failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const coverLetter = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ coverLetter });
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
