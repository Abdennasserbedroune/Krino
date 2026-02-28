import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

// ─── Utility: coerce any Groq array item to a plain string ───────────────────────────
function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): string => {
      if (typeof item === "string") return item.trim();
      if (item === null || item === undefined) return "";
      if (typeof item === "object") {
        const o = item as Record<string, unknown>;
        const label =
          (typeof o.skill       === "string" && o.skill)    ||
          (typeof o.category    === "string" && o.category) ||
          (typeof o.type        === "string" && o.type)     || "";
        const body =
          (typeof o.description === "string" && o.description) ||
          (typeof o.text        === "string" && o.text)        ||
          (typeof o.advice      === "string" && o.advice)      ||
          (typeof o.tip         === "string" && o.tip)         ||
          (typeof o.point       === "string" && o.point)       ||
          (typeof o.item        === "string" && o.item)        ||
          (typeof o.content     === "string" && o.content)     ||
          (typeof o.value       === "string" && o.value)       || "";
        if (label && body) return `${label} — ${body}`;
        if (body)           return body;
        if (label)          return label;
        const fallback = Object.values(o)
          .filter((v): v is string => typeof v === "string")
          .join(" — ");
        return fallback || JSON.stringify(item);
      }
      return String(item).trim();
    })
    .filter(Boolean);
}

// ─── Deterministic helpers (domain + experience) ───────────────────────────────────────────────
// Weights:  domain 40%  •  skills 30%  •  experience 20%  •  cv-quality 10%
// Skills score now comes from the AI (semantic), not from string matching.

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

const DOMAIN_KW: Record<string, string[]> = {
  "ai & data": [
    "data", "analytics", "machine learning", "ml", "ai", "python", "sql",
    "pandas", "tableau", "power bi", "statistics", "modeling", "etl",
    "big data", "visualization", "scikit", "tensorflow", "spark",
  ],
  "software engineering": [
    "software", "developer", "engineer", "javascript", "typescript", "react",
    "node", "java", "c#", "c++", "backend", "frontend", "api", "git",
    "agile", "devops", "cloud", "aws", "azure", "docker", "kubernetes",
  ],
  "product management": [
    "product manager", "roadmap", "backlog", "stakeholder", "kpi",
    "agile", "scrum", "user story", "product", "launch", "market research",
    "go-to-market", "okr",
  ],
  "marketing & growth": [
    "marketing", "campaign", "seo", "sem", "growth", "branding",
    "content", "social media", "digital", "ads", "conversion",
    "email marketing", "copywriting", "inbound",
  ],
  "finance & banking": [
    "finance", "financial", "bank", "investment", "valuation",
    "accounting", "audit", "cfa", "excel", "modeling", "budget",
    "p&l", "treasury", "risk", "compliance",
  ],
  "design & ux": [
    "design", "designer", "ux", "ui", "figma", "wireframe",
    "prototype", "adobe", "sketch", "user research", "usability",
    "interaction design", "visual design",
  ],
  "sales": [
    "sales", "crm", "revenue", "quota", "pipeline", "b2b", "b2c",
    "account manager", "closing", "negotiation", "prospecting",
    "salesforce", "outbound", "cold calling", "business development",
  ],
  "hr & people": [
    "hr", "human resources", "recruiting", "talent acquisition",
    "onboarding", "payroll", "culture", "employee relations",
    "performance review", "hris", "compensation",
  ],
  "operations": [
    "operations", "supply chain", "logistics", "procurement",
    "process improvement", "lean", "six sigma", "warehouse",
    "inventory", "vendor management",
  ],
  "legal": [
    "legal", "law", "attorney", "compliance", "regulatory",
    "contract", "litigation", "counsel", "paralegal", "gdpr",
  ],
};

function domainScore(domain: string, rawText: string): number {
  const base = (domain || "").toLowerCase();
  const cvLower = rawText.toLowerCase();
  let jobKws: string[] | null = null;
  for (const [key, kws] of Object.entries(DOMAIN_KW)) {
    if (base.includes(key)) { jobKws = kws; break; }
  }
  if (!jobKws) return 15;
  const hits = jobKws.filter((kw) => cvLower.includes(kw)).length;
  if (hits === 0) return 10;
  if (hits === 1) return 25;
  return Math.max(20, Math.min(95, Math.floor((hits / jobKws.length) * 100)));
}

// Fallback string-match skills score (used only if AI omits semantic_skills_score)
function fallbackSkillsScore(requiredSkills: string[], cvSkills: unknown): number {
  if (!requiredSkills.length) return 50;
  const jobSet = new Set(requiredSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const cvTokens: string[] = [];
  if (Array.isArray(cvSkills)) {
    for (const item of cvSkills)
      if (typeof item === "string")
        cvTokens.push(...item.toLowerCase().split(",").map((s) => s.trim()));
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
  if (!cvSet.size) return 20;
  const hits = [...jobSet].filter((t) => cvSet.has(t)).length;
  if (!hits) return 10;
  return Math.max(15, Math.min(95, Math.floor((hits / jobSet.size) * 100)));
}

function combineScores(domain: number, experience: number, skills: number, quality: number): number {
  return Math.max(0, Math.min(100, Math.floor(0.40 * domain + 0.30 * skills + 0.20 * experience + 0.10 * quality)));
}

// ─── Step 1: Extract REAL job requirements (filter noise) ──────────────────────────────────

async function extractJobRequirements(
  groq: Groq,
  desc: string,
  category: string,
  title: string,
  skillsHint: string,
): Promise<Record<string, unknown>> {
  const snippet = desc.trim().slice(0, 3000);
  const prefix = [
    category   ? `Job category: ${category}` : "",
    title      ? `Job title: ${title}`        : "",
    skillsHint ? `Skills the applicant mentioned: ${skillsHint}` : "",
  ].filter(Boolean).join("\n");

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a senior technical recruiter extracting REAL professional requirements from job descriptions.\n" +
            "\n" +
            "ONLY extract requirements that a candidate would realistically list on a CV or LinkedIn profile:\n" +
            "  • Technical tools, frameworks, programming languages, platforms\n" +
            "  • Domain-specific methodologies (e.g. Agile, Six Sigma, IFRS)\n" +
            "  • Industry certifications (e.g. PMP, CFA, AWS Solutions Architect)\n" +
            "  • Language skills ONLY when they are a genuine business requirement " +
            "    (e.g. client-facing role in French, documentation in Arabic) — NOT generic literacy\n" +
            "\n" +
            "IGNORE — do NOT extract these even if mentioned in the job description:\n" +
            "  • Hardware or equipment (computer, laptop, phone, internet connection, car)\n" +
            "  • Generic soft skills (communication, teamwork, problem-solving, motivation, adaptability)\n" +
            "  • Obvious prerequisites every professional has (ability to work, willingness to learn)\n" +
            "  • Physical requirements (ability to lift, driving license unless specifically required)\n" +
            "  • Company perks or benefits (free lunch, health insurance, flexible hours)\n" +
            "  • Legal formalities (right to work, background check)\n" +
            "\n" +
            "Be conservative: if unsure whether something belongs on a CV, leave it out.",
        },
        {
          role: "user",
          content:
            `${prefix ? prefix + "\n\n" : ""}=== JOB DESCRIPTION ===\n${snippet}\n\n` +
            "Return JSON with exactly these keys:\n" +
            "  required_skills: array of plain strings (real CV-listable skills only)\n" +
            "  nice_to_have: array of plain strings\n" +
            "  seniority_level: string\n" +
            "  key_responsibilities: array of plain strings (max 5, concise)\n" +
            "  experience_years: string\n" +
            "  domain: string\n" +
            "All array values MUST be plain strings, never objects.",
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

// ─── Step 2: Semantic narrative + skills score in one call ──────────────────────────────────
// Returns everything needed for the UI PLUS a semantic_skills_score (0-100)
// based on meaning, synonyms, and implied knowledge — not string overlap.

async function analyzeCvAgainstJob(
  groq: Groq,
  jobReqs: Record<string, unknown>,
  cvStructured: Record<string, unknown>,
  rawCvText: string,
  cvScore: number,
  jobTitle: string,
): Promise<Record<string, unknown>> {
  const titleLine = jobTitle ? `Job title: ${jobTitle}\n` : "";
  const reqJson = JSON.stringify(jobReqs, null, 2);

  // Include both structured data AND a snippet of raw text so the model
  // can find skills that weren't cleanly parsed into structured_data
  const allowedKeys = ["personal_info", "summary", "experience", "education", "skills", "certifications", "languages"];
  const compact: Record<string, unknown> = {};
  for (const k of allowedKeys) if (cvStructured[k] !== undefined) compact[k] = cvStructured[k];
  const cvJson = JSON.stringify(compact, null, 2).slice(0, 2000);
  const rawSnippet = (rawCvText || "").slice(0, 800); // extra context for synonyms

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a senior career advisor and technical recruiter. " +
            "Evaluate how well a candidate's CV matches a job role with honesty and precision.\n" +
            "\n" +
            "SKILLS ASSESSMENT RULES (for semantic_skills_score):\n" +
            "  • Treat synonyms as matches: ML = machine learning, JS = JavaScript, " +
            "    NLP = natural language processing, CV = computer vision\n" +
            "  • Treat implied skills as matches: if the candidate uses PyTorch they know Python; " +
            "    if they built REST APIs they know HTTP/JSON; if they use dbt they know SQL\n" +
            "  • Treat technology families: scikit-learn ⇒ knows ML; React ⇒ knows JavaScript\n" +
            "  • IGNORE requirements that are not real CV skills: " +
            "    hardware, obvious soft skills, generic literacy, physical requirements\n" +
            "  • Only penalise for skills that are GENUINELY absent from the candidate's background\n" +
            "\n" +
            "Be brutally honest in the narrative. Reference SPECIFIC tools and experience. " +
            "For gaps, state severity: [BLOCKING], [IMPORTANT], or [MINOR].",
        },
        {
          role: "user",
          content:
            `${titleLine}` +
            `=== ROLE REQUIREMENTS ===\n${reqJson}\n\n` +
            `=== CANDIDATE CV (structured) ===\n${cvJson}\n\n` +
            `=== CANDIDATE CV (raw text snippet for context) ===\n${rawSnippet}\n\n` +
            `CV quality score: ${cvScore}/100\n\n` +
            "Return JSON with EXACTLY these keys:\n" +
            "  semantic_skills_score: integer 0-100 " +
            "(how well the candidate's skills match the REAL requirements, using synonym/implication reasoning)\n" +
            "  overall_verdict: string (one sentence)\n" +
            "  hire_probability: string (e.g. \"Low — 12%\", \"Moderate — 50%\", \"High — 82%\")\n" +
            "  overall_reason: string (2-3 sentences, specific)\n" +
            "  strengths: array of plain strings (specific tools/skills that match)\n" +
            "  gaps: array of plain strings (each starting with [BLOCKING], [IMPORTANT], or [MINOR])\n" +
            "  actionable_advice: array of plain strings (concrete next steps)\n" +
            "  application_ready: boolean\n" +
            "IMPORTANT: all array values must be plain strings, never nested objects.",
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1600,
    });
    return JSON.parse(resp.choices[0].message.content ?? "{}");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      semantic_skills_score: null,
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
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      cv_id: number | string;
      job_category?: string;
      job_title?: string;
      job_description?: string;
      experience_required?: string;
      skills_required?: string;
    };

    const cvIdRaw = body.cv_id;
    if (!cvIdRaw) return NextResponse.json({ detail: "cv_id is required" }, { status: 400 });
    const cvId = parseInt(String(cvIdRaw), 10);
    if (isNaN(cvId)) return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });

    const { data: cv, error: dbError } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !cv) return NextResponse.json({ detail: "CV not found" }, { status: 404 });
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key is not configured" }, { status: 500 });
    }

    const rawText: string = (cv.extracted_cv as Record<string, unknown>)?.raw_text as string || "";
    const structuredData  = (cv.structured_data  as Record<string, unknown>) || {};
    const cvScore: number = (cv.score as number) || 0;

    const jobCategory        = body.job_category        || "";
    const jobTitle           = body.job_title           || "";
    const jobDescription     = (body.job_description    || "").slice(0, 5000);
    const experienceRequired = body.experience_required || "";
    const skillsRequired     = body.skills_required     || "";

    // Deterministic: domain + experience
    const candidateYears = parseCandidateYears(rawText);
    const expScore = experienceScore(candidateYears, experienceRequired);
    const domScore = domainScore(jobCategory, rawText);

    // Step 1: Extract clean job requirements (noise filtered by prompt)
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const jobReqs = await extractJobRequirements(groq, jobDescription, jobCategory, jobTitle, skillsRequired);

    // Step 2: Semantic narrative + semantic_skills_score in one AI call
    const aiResult = await analyzeCvAgainstJob(
      groq, jobReqs, structuredData, rawText, cvScore, jobTitle
    );

    // Skills score: prefer AI semantic score, fall back to string match
    const aiSkillsScore = typeof aiResult.semantic_skills_score === "number"
      ? Math.max(0, Math.min(100, Math.floor(aiResult.semantic_skills_score)))
      : null;

    const requiredSkills = normalizeStringArray(jobReqs.required_skills);
    const fallbackSkills = skillsRequired.split(",").map((s) => s.trim()).filter(Boolean);
    const skScore = aiSkillsScore ?? fallbackSkillsScore(
      requiredSkills.length ? requiredSkills : fallbackSkills,
      structuredData.skills
    );

    const totalScore = combineScores(domScore, expScore, skScore, cvScore);

    return NextResponse.json({
      cv_id:              cv.id,
      file_name:          cv.original_filename,
      match_score:        totalScore,
      skills_match_score: skScore,
      experience_score:   expScore,
      cv_quality_score:   cvScore,
      overall_verdict:    typeof aiResult.overall_verdict === "string" ? aiResult.overall_verdict : "",
      hire_probability:   typeof aiResult.hire_probability === "string" ? aiResult.hire_probability : "N/A",
      overall_reason:     typeof aiResult.overall_reason   === "string" ? aiResult.overall_reason   : "",
      strengths:          normalizeStringArray(aiResult.strengths),
      gaps:               normalizeStringArray(aiResult.gaps),
      actionable_advice:  normalizeStringArray(aiResult.actionable_advice),
      application_ready:  Boolean(aiResult.application_ready),
      job_requirements:   jobReqs,
    }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[match-to-job] unhandled error:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
