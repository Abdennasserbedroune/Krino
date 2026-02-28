import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

// ─── Deterministic scoring helpers ────────────────────────────────────────────────────────────

function parseCandidateYears(text: string): number {
  const matches = (text || "").match(/(\d{1,2})\+?\s+years?/gi) || [];
  if (!matches.length) return 0;
  return Math.max(...matches.map((m) => parseInt(m.match(/\d+/)![0], 10)));
}

function parseRequiredYears(rangeStr: string): number {
  const digits = (rangeStr || "").match(/\d+/g) || [];
  if (!digits.length) return 0;
  if (digits.length === 1) return parseInt(digits[0], 10);
  return Math.round((parseInt(digits[0], 10) + parseInt(digits[1], 10)) / 2);
}

function experienceScore(candidateYears: number, requiredRange: string): number {
  const required = parseRequiredYears(requiredRange);
  if (required <= 0) return 60;
  if (candidateYears <= 0) return 30;
  const shortfall = required - candidateYears;
  if (shortfall >= 4) return 20;
  if (shortfall >= 2) return 35;
  if (shortfall > 0) return 50;
  const extra = candidateYears - required;
  if (extra <= 1) return 90;
  if (extra <= 3) return 80;
  return 70;
}

const DOMAIN_KW: Record<string, string[]> = {
  "ai & data": ["data", "analytics", "machine learning", "ml", "ai", "python", "sql"],
  "software engineering": ["software", "developer", "engineer", "javascript", "typescript", "react", "node", "java", "c#", "c++"],
  "product management": ["product manager", "roadmap", "backlog", "stakeholder", "kpi"],
  "marketing & growth": ["marketing", "campaign", "seo", "sem", "growth", "branding"],
  "finance & banking": ["finance", "financial", "bank", "investment", "valuation"],
  "design & ux": ["design", "designer", "ux", "ui", "figma", "wireframe", "prototype", "adobe"],
};

function domainScore(domain: string, rawText: string): number {
  const base = (domain || "").toLowerCase();
  let kws: string[] | null = null;
  for (const [key, words] of Object.entries(DOMAIN_KW)) {
    if (base.includes(key)) { kws = words; break; }
  }
  if (!kws) return 60;
  const lower = rawText.toLowerCase();
  const hits = kws.filter((w) => lower.includes(w)).length;
  if (hits === 0) return 20;
  return Math.max(30, Math.min(95, Math.floor((hits / kws.length) * 100)));
}

function skillsScore(requiredSkills: string[], cvSkills: unknown): number {
  if (!requiredSkills.length) return 60;
  const jobSet = new Set(requiredSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));

  const cvTokens: string[] = [];
  if (Array.isArray(cvSkills)) {
    for (const item of cvSkills) {
      if (typeof item === "string")
        cvTokens.push(...item.toLowerCase().split(",").map((s) => s.trim()));
    }
  } else if (cvSkills && typeof cvSkills === "object") {
    for (const val of Object.values(cvSkills as Record<string, unknown>)) {
      if (typeof val === "string")
        cvTokens.push(...val.toLowerCase().split(",").map((s) => s.trim()));
      else if (Array.isArray(val))
        for (const v of val)
          if (typeof v === "string")
            cvTokens.push(...v.toLowerCase().split(",").map((s) => s.trim()));
    }
  }
  const cvSet = new Set(cvTokens.filter(Boolean));
  if (!jobSet.size || !cvSet.size) return 50;
  const hits = [...jobSet].filter((t) => cvSet.has(t)).length;
  if (!hits) return 25;
  return Math.max(40, Math.min(95, Math.floor((hits / jobSet.size) * 100)));
}

function combineScores(d: number, e: number, s: number, q: number): number {
  return Math.max(0, Math.min(100, Math.floor(0.35 * d + 0.30 * e + 0.25 * s + 0.10 * q)));
}

// ─── Groq helpers ──────────────────────────────────────────────────────────────────────

async function extractJobRequirements(
  groq: Groq,
  desc: string,
  category: string,
  title: string,
  skillsHint: string,
): Promise<Record<string, unknown>> {
  const snippet = desc.trim().slice(0, 3000);
  const prefix = [
    category ? `Job category: ${category}` : "",
    title ? `Job title: ${title}` : "",
    skillsHint ? `Skills mentioned by the applicant: ${skillsHint}` : "",
  ].filter(Boolean).join("\n");

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a precise job requirements extractor. Read the job description and return structured JSON. " +
            "Be specific — pull exact tools, technologies, and experience levels. " +
            "Do NOT invent requirements not stated in the description.",
        },
        {
          role: "user",
          content:
            `${prefix ? prefix + "\n\n" : ""}=== JOB DESCRIPTION ===\n${snippet}\n\n` +
            "Return JSON with exactly: required_skills (array), nice_to_have (array), " +
            "seniority_level (string), key_responsibilities (array, max 5), " +
            "experience_years (string), domain (string).",
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 800,
    });
    return JSON.parse(resp.choices[0].message.content ?? "{}");
  } catch {
    return {
      required_skills: skillsHint.split(",").map((s) => s.trim()).filter(Boolean),
      nice_to_have: [],
      seniority_level: "",
      key_responsibilities: [],
      experience_years: "",
      domain: category,
      _fallback: true,
    };
  }
}

async function analyzeCvAgainstJob(
  groq: Groq,
  jobReqs: Record<string, unknown>,
  cvStructured: Record<string, unknown>,
  cvScore: number,
  jobTitle: string,
): Promise<Record<string, unknown>> {
  const titleLine = jobTitle ? `Job title: ${jobTitle}\n` : "";
  const reqJson = JSON.stringify(jobReqs, null, 2);

  const allowedKeys = ["personal_info", "summary", "experience", "education", "skills", "certifications", "languages"];
  const compact: Record<string, unknown> = {};
  for (const k of allowedKeys) if (cvStructured[k] !== undefined) compact[k] = cvStructured[k];
  const cvJson = JSON.stringify(compact, null, 2).slice(0, 2500);

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a brutally honest but constructive career advisor. " +
            "Tell the job seeker exactly how well their CV matches the role. " +
            "Reference SPECIFIC skills, tools, and experience from the CV — never speak in generalities. " +
            "For each gap state its severity: [BLOCKING], [IMPORTANT], or [MINOR]. " +
            "Be honest about weak matches — false hope hurts the user.",
        },
        {
          role: "user",
          content:
            `${titleLine}=== ROLE REQUIREMENTS ===\n${reqJson}\n\n` +
            `=== CANDIDATE CV ===\n${cvJson}\n\n` +
            `CV quality score: ${cvScore}/100\n\n` +
            "Return JSON with exactly: overall_verdict (string), hire_probability (string), " +
            "overall_reason (string), strengths (array), gaps (array), " +
            "actionable_advice (array), application_ready (boolean).",
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });
    return JSON.parse(resp.choices[0].message.content ?? "{}");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      overall_verdict: "Analysis unavailable — please try again.",
      hire_probability: "N/A",
      overall_reason: `The AI analysis could not be completed: ${msg}`,
      strengths: [],
      gaps: [],
      actionable_advice: ["Try again in a few seconds — the AI service may be temporarily busy."],
      application_ready: false,
    };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json() as {
      cv_id: number | string;
      job_category?: string;
      job_title?: string;
      job_description?: string;
      experience_required?: string;
      skills_required?: string;
    };

    const cvIdRaw = body.cv_id;
    if (!cvIdRaw) {
      return NextResponse.json({ detail: "cv_id is required" }, { status: 400 });
    }
    const cvId = parseInt(String(cvIdRaw), 10);
    if (isNaN(cvId)) {
      return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
    }

    // 3. Load CV from Supabase
    const { data: cv, error: dbError } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !cv) {
      return NextResponse.json({ detail: "CV not found" }, { status: 404 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key is not configured" }, { status: 500 });
    }

    // 4. Extract CV data
    const rawText: string = (cv.extracted_cv as Record<string, unknown>)?.raw_text as string || "";
    const structuredData = (cv.structured_data as Record<string, unknown>) || {};
    const analysisResult = (cv.analysis_result as Record<string, unknown>) || {};
    const cvScore: number = (cv.score as number) || 0;

    const jobCategory = body.job_category || "";
    const jobTitle = body.job_title || "";
    const jobDescription = (body.job_description || "").slice(0, 5000);
    const experienceRequired = body.experience_required || "";
    const skillsRequired = body.skills_required || "";

    // 5. Deterministic scoring
    const candidateYears = parseCandidateYears(rawText);
    const expScore = experienceScore(candidateYears, experienceRequired);
    const domScore = domainScore(jobCategory, rawText);

    // 6. Step 1 — extract job requirements via Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const jobReqs = await extractJobRequirements(groq, jobDescription, jobCategory, jobTitle, skillsRequired);

    // 7. Skills score
    const requiredSkills = (jobReqs.required_skills as string[]) || [];
    const fallbackSkills = skillsRequired.split(",").map((s) => s.trim()).filter(Boolean);
    const skScore = skillsScore(requiredSkills.length ? requiredSkills : fallbackSkills, structuredData.skills);

    const totalScore = combineScores(domScore, expScore, skScore, cvScore);

    // 8. Step 2 — AI narrative via Groq
    const aiResult = await analyzeCvAgainstJob(groq, jobReqs, structuredData, cvScore, jobTitle);

    // 9. Respond
    return NextResponse.json({
      cv_id: cv.id,
      file_name: cv.original_filename,
      match_score: totalScore,
      skills_match_score: skScore,
      experience_score: expScore,
      cv_quality_score: cvScore,
      overall_verdict: (aiResult.overall_verdict as string) || "",
      hire_probability: (aiResult.hire_probability as string) || "N/A",
      overall_reason: (aiResult.overall_reason as string) || "",
      strengths: (aiResult.strengths as string[]) || [],
      gaps: (aiResult.gaps as string[]) || [],
      actionable_advice: (aiResult.actionable_advice as string[]) || [],
      application_ready: Boolean(aiResult.application_ready),
      job_requirements: jobReqs,
    }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[match-to-job] unhandled error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
