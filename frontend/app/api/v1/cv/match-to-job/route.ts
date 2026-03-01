import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const ANALYSIS_MODEL = "qwen/qwen3-32b";

// ─── Utilities ───────────────────────────────────────────────────────────────

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): string => {
      if (typeof item === "string") return item.trim();
      if (!item) return "";
      if (typeof item === "object") {
        return Object.values(item as Record<string, unknown>)
          .filter((v): v is string => typeof v === "string")
          .join(" — ");
      }
      return String(item).trim();
    })
    .filter(Boolean);
}

function isMeaningfulJobDescription(desc: string): boolean {
  const text = (desc || "").trim();
  if (text.length < 120) return false;
  const alpha = text.replace(/[^a-zA-Z]/g, "");
  if (alpha.length < 60) return false;
  const vowels = (alpha.match(/[aeiouAEIOU]/g) || []).length;
  if (vowels / alpha.length < 0.15) return false;
  const tokens = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(t => t.length >= 3);
  if (tokens.length < 18) return false;
  const unique = new Set(tokens).size;
  if (unique < 10 || unique / tokens.length < 0.35) return false;
  return true;
}

// ─── Deterministic experience score ───────────────────────────────────────────

function parseCandidateYears(text: string): number {
  const matches = (text || "").match(/(\d{1,2})\+?\s+years?/gi) || [];
  if (!matches.length) return 0;
  return Math.max(...matches.map(m => parseInt(m.match(/\d+/)![0], 10)));
}

function parseRequiredYears(rangeStr: string): number {
  const digits = (rangeStr || "").match(/\d+/g) || [];
  if (!digits.length) return 0;
  if (digits.length === 1) return parseInt(digits[0], 10);
  return Math.round((parseInt(digits[0], 10) + parseInt(digits[1], 10)) / 2);
}

function experienceScore(candidateYears: number, requiredRange: string): number {
  const required = parseRequiredYears(requiredRange);
  if (required <= 0) return 55;
  if (candidateYears <= 0) return 20;
  const shortfall = required - candidateYears;
  if (shortfall >= 4) return 15;
  if (shortfall >= 2) return 35;
  if (shortfall > 0) return 50;
  const extra = candidateYears - required;
  if (extra <= 1) return 90;
  if (extra <= 3) return 80;
  return 70;
}

// ─── Single-pass analysis ────────────────────────────────────────────────────────

async function runFullAnalysis(
  groq: Groq,
  jobDescription: string,
  jobTitle: string,
  jobCategory: string,
  expLevel: string,
  skillsHint: string,
  cvStructured: Record<string, unknown>,
  rawCvText: string,
  cvScore: number,
): Promise<Record<string, unknown>> {

  const meta = [
    jobTitle    ? `Job Title: ${jobTitle}`                              : "",
    jobCategory ? `Job Category: ${jobCategory}`                        : "",
    expLevel    ? `Experience Level (stated by applicant): ${expLevel}` : "",
    skillsHint  ? `Applicant listed these skills: ${skillsHint}`       : "",
  ].filter(Boolean).join("\n");

  const allowedKeys = ["personal_info", "summary", "experience", "education", "skills", "certifications", "languages"];
  const compact: Record<string, unknown> = {};
  for (const k of allowedKeys) if (cvStructured[k] !== undefined) compact[k] = cvStructured[k];

  const cvJson  = JSON.stringify(compact, null, 2).slice(0, 2500);
  const rawSnip = (rawCvText || "").slice(0, 1200);
  const jdSlice = jobDescription.trim().slice(0, 4500);

  const systemPrompt =
    "You are a senior technical recruiter and career strategist doing a deep, grounded CV-to-job evaluation.\n\n" +
    "CRITICAL RULES — breaking any of these makes the output wrong:\n" +
    "1. Only flag a gap for something EXPLICITLY written in the Job Description. Never invent requirements.\n" +
    "2. Apply synonym/implication matching — count these as PRESENT:\n" +
    "   ML = machine learning, JS = JavaScript, REST API experience implies HTTP/JSON knowledge,\n" +
    "   PyTorch user implies Python, React developer implies JavaScript, dbt user implies SQL.\n" +
    "3. Write gaps and strengths as natural, flowing language — like a mentor explaining to the candidate.\n" +
    "   Do NOT use robotic label formats like 'JD requires: ... | Your CV shows: ...'.\n" +
    "   Instead write prose: explain the situation, what the candidate brings or doesn't, and what to do.\n" +
    "4. Every fix must be specific: name the exact tool, course title, platform, or project type.\n" +
    "5. Every strength must reference actual CV evidence: company name, project, metric, or role.\n" +
    "6. Roadmap steps must be concrete and directly address the gaps found — not generic advice.";

  const userPrompt =
    `${meta ? meta + "\n\n" : ""}` +
    `=== JOB DESCRIPTION (only source for requirements) ===\n${jdSlice}\n\n` +
    `=== CANDIDATE CV — STRUCTURED ===\n${cvJson}\n\n` +
    `=== CANDIDATE CV — RAW TEXT (use for context and synonyms) ===\n${rawSnip}\n\n` +
    `CV Quality Score: ${cvScore}/100\n\n` +
    "Return a JSON object with EXACTLY these keys. All array items must be plain strings.\n\n" +
    "{\n" +
    '  "extracted_requirements": {\n' +
    '    "required_skills": string[],\n' +
    '    "nice_to_have": string[],\n' +
    '    "experience_years": string,\n' +
    '    "seniority_level": string,\n' +
    '    "key_responsibilities": string[]\n' +
    "  },\n" +
    '  "semantic_skills_score": integer 0-100,\n' +
    '  "overall_verdict": "One clear, honest sentence.",\n' +
    '  "hire_probability": "e.g. Low — 18% or Moderate — 52% or High — 81%",\n' +
    '  "overall_reason": "2-3 sentences. Cite specific CV facts vs JD requirements.",\n' +
    "\n" +
    "  // Format for EACH gap item (plain string, use pipe | as the single separator):\n" +
    "  // \"[BLOCKING|IMPORTANT|MINOR] <Short Skill Name> | <2-3 natural sentences as a recruiter talking to the candidate:\n" +
    "  //   Sentence 1: What this role specifically needs here and why it matters in this context (cite the JD naturally, don't quote it robotically).\n" +
    "  //   Sentence 2: What the candidate's CV actually shows — or honestly acknowledge it\'s not there.\n" +
    "  //   Sentence 3: A concrete, specific action to close this gap — name the exact tool, course title, or project idea with a realistic timeframe.\n" +
    "  //   Sound like a mentor who has read both documents carefully, not a form being filled out.\"\n" +
    '  "gaps": [\n' +
    '    "[BLOCKING] <Skill Name> | <natural prose paragraph as described above>"\n' +
    "  ],\n" +
    "\n" +
    "  // Format for EACH strength item (plain string, use pipe | as the single separator):\n" +
    "  // \"✅ <Short Skill Name> | <2 natural sentences: (1) how this specific CV experience directly answers what the role needs\n" +
    "  //   — reference the actual company/project/metric from the CV, (2) why this is a genuine advantage for this application.\n" +
    "  //   Sound like a recruiter who genuinely sees the value.\"\n" +
    '  "strengths": [\n' +
    '    "✅ <Skill Name> | <natural prose as described above>"\n' +
    "  ],\n" +
    "\n" +
    '  "actionable_advice": [\n' +
    '    "<Concrete step. Name specific resource (course title + platform, or project type). State expected outcome.>"\n' +
    "  ],\n" +
    '  "roadmap": [\n' +
    '    "Week 1-2: <specific action targeting BLOCKING gaps>",\n' +
    '    "Week 3-4: <CV updates + IMPORTANT gaps>",\n' +
    '    "Month 2: <portfolio or certification — name it specifically>",\n' +
    '    "Month 3+: <readiness and application strategy>"\n' +
    "  ],\n" +
    '  "application_ready": boolean\n' +
    "}";

  try {
    const resp = await groq.chat.completions.create({
      model: ANALYSIS_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
      temperature: 0.15,
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    return JSON.parse(resp.choices[0].message.content ?? "{}");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      extracted_requirements: { required_skills: [], nice_to_have: [], experience_years: "", seniority_level: "", key_responsibilities: [] },
      semantic_skills_score: null,
      overall_verdict: "Analysis unavailable — please try again.",
      hire_probability: "N/A",
      overall_reason: `Analysis failed: ${msg}`,
      strengths: [],
      gaps: [],
      actionable_advice: ["Try again in a few seconds."],
      roadmap: [],
      application_ready: false,
    };
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      cv_id: number | string;
      job_category?: string;
      job_title?: string;
      job_description?: string;
      experience_required?: string;
      skills_required?: string;
    };

    const cvId = parseInt(String(body.cv_id ?? ""), 10);
    if (!body.cv_id || isNaN(cvId)) return NextResponse.json({ detail: "cv_id is required" }, { status: 400 });

    const { data: cv, error: dbError } = await supabase
      .from("cvs").select("*").eq("id", cvId).eq("user_id", user.id).single();

    if (dbError || !cv)           return NextResponse.json({ detail: "CV not found" }, { status: 404 });
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ detail: "Groq API key not configured" }, { status: 500 });

    const rawText    = ((cv.extracted_cv as Record<string, unknown>)?.raw_text as string) || "";
    const structured = (cv.structured_data as Record<string, unknown>) || {};
    const cvScore    = (cv.score as number) || 0;

    const jobCategory = body.job_category        || "";
    const jobTitle    = body.job_title           || "";
    const jobDesc     = (body.job_description    || "").slice(0, 5000);
    const expRequired = body.experience_required || "";
    const skillsHint  = body.skills_required     || "";

    if (!isMeaningfulJobDescription(jobDesc)) {
      return NextResponse.json(
        { detail: "Job description is too short or looks invalid. Paste the full real job posting (responsibilities + requirements)." },
        { status: 400 },
      );
    }

    const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const analysis = await runFullAnalysis(groq, jobDesc, jobTitle, jobCategory, expRequired, skillsHint, structured, rawText, cvScore);

    const extractedExpYears = (analysis.extracted_requirements as any)?.experience_years || expRequired;
    const candidateYears    = parseCandidateYears(rawText);
    const expScore          = experienceScore(candidateYears, extractedExpYears);

    const skScore = typeof analysis.semantic_skills_score === "number"
      ? Math.max(0, Math.min(100, Math.floor(analysis.semantic_skills_score)))
      : 40;

    const totalScore = Math.max(0, Math.min(100, Math.floor(0.5 * skScore + 0.3 * expScore + 0.2 * cvScore)));

    return NextResponse.json({
      cv_id:              cv.id,
      file_name:          cv.original_filename,
      match_score:        totalScore,
      skills_match_score: skScore,
      experience_score:   expScore,
      cv_quality_score:   cvScore,
      overall_verdict:    typeof analysis.overall_verdict  === "string" ? analysis.overall_verdict  : "",
      hire_probability:   typeof analysis.hire_probability === "string" ? analysis.hire_probability : "N/A",
      overall_reason:     typeof analysis.overall_reason   === "string" ? analysis.overall_reason   : "",
      strengths:          normalizeStringArray(analysis.strengths),
      gaps:               normalizeStringArray(analysis.gaps),
      actionable_advice:  normalizeStringArray(analysis.actionable_advice),
      roadmap:            normalizeStringArray(analysis.roadmap),
      application_ready:  Boolean(analysis.application_ready),
      job_requirements:   analysis.extracted_requirements || {},
    }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[match-to-job] unhandled error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
