import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Role map: CV title/text → Remotive category + search term ────────────────────────────────────

interface RoleMapping {
  role: string;      // Human-readable label shown to user
  category: string;  // Remotive category slug
  search: string;    // Free-text search term for Remotive
  patterns: RegExp[];
}

// Order matters — more specific patterns first.
const ROLE_MAP: RoleMapping[] = [
  // ——— Legal ——————————————————————————————————————————————————————
  { role: "Lawyer", category: "legal", search: "lawyer",
    patterns: [/\b(lawyer|attorney|counsel|solicitor|barrister|jurist|legal advisor|avocat)\b/i] },
  { role: "Legal Compliance", category: "legal", search: "compliance",
    patterns: [/\b(compliance officer|compliance manager|regulatory|gdpr|data protection officer|dpo)\b/i] },
  { role: "Paralegal", category: "legal", search: "paralegal",
    patterns: [/\b(paralegal|legal assistant|legal secretary|legal clerk)\b/i] },
  { role: "Contract Manager", category: "legal", search: "contract manager",
    patterns: [/\b(contract manager|contracts administrator|procurement officer)\b/i] },

  // ——— Finance —————————————————————————————————————————————————————
  { role: "Financial Analyst", category: "finance", search: "financial analyst",
    patterns: [/\b(financial analyst|fp&a|financial planning|investment analyst|equity analyst)\b/i] },
  { role: "Accountant", category: "finance", search: "accountant",
    patterns: [/\b(accountant|accounting|cpa|cfa|bookkeeper|cost accountant|management accountant)\b/i] },
  { role: "Auditor", category: "finance", search: "auditor",
    patterns: [/\b(auditor|audit manager|internal audit|external audit)\b/i] },
  { role: "Finance Manager", category: "finance", search: "finance manager",
    patterns: [/\b(finance manager|cfo|chief financial|controller|treasury|head of finance)\b/i] },

  // ——— Data ——————————————————————————————————————————————————————
  { role: "Data Scientist", category: "data", search: "data scientist",
    patterns: [/\b(data scientist|machine learning engineer|ml engineer|ai researcher|deep learning|nlp engineer)\b/i] },
  { role: "Data Engineer", category: "data", search: "data engineer",
    patterns: [/\b(data engineer|etl developer|spark engineer|airflow|dbt|data pipeline|lakehouse)\b/i] },
  { role: "Data Analyst", category: "data", search: "data analyst",
    patterns: [/\b(data analyst|business analyst|bi analyst|power bi|tableau|looker|business intelligence)\b/i] },

  // ——— DevOps —————————————————————————————————————————————————————
  { role: "DevOps Engineer", category: "devops-sysadmin", search: "devops",
    patterns: [/\b(devops|site reliability|sre|kubernetes|terraform|ci\/cd|cloud infrastructure|platform engineer)\b/i] },

  // ——— Software ————————————————————————————————————————————————————
  { role: "Full Stack Developer", category: "software-dev", search: "full stack developer",
    patterns: [/\b(full[\s-]?stack)\b/i] },
  { role: "Frontend Developer", category: "software-dev", search: "frontend developer",
    patterns: [/\b(frontend|front-end|react developer|vue developer|angular developer|next\.js)\b/i] },
  { role: "Backend Developer", category: "software-dev", search: "backend developer",
    patterns: [/\b(backend|back-end|node\.js developer|django|spring boot|laravel|fastapi)\b/i] },
  { role: "Mobile Developer", category: "software-dev", search: "mobile developer",
    patterns: [/\b(mobile developer|ios developer|android developer|react native|flutter|swift|kotlin)\b/i] },
  { role: "Software Engineer", category: "software-dev", search: "software engineer",
    patterns: [/\b(software engineer|software developer|programmer|coder)\b/i] },

  // ——— Product ————————————————————————————————————————————————————
  { role: "Product Manager", category: "product", search: "product manager",
    patterns: [/\b(product manager|product management|product owner|chief product|head of product)\b/i] },
  { role: "Project Manager", category: "management-finance", search: "project manager",
    patterns: [/\b(project manager|program manager|pmp|scrum master|agile coach|delivery manager)\b/i] },

  // ——— Design ————————————————————————————————————————————————————
  { role: "UX Designer", category: "design", search: "ux designer",
    patterns: [/\b(ux designer|ui designer|ui\/ux|product designer|interaction designer|figma designer)\b/i] },
  { role: "Graphic Designer", category: "design", search: "graphic designer",
    patterns: [/\b(graphic designer|visual designer|brand designer|illustrator|motion designer)\b/i] },

  // ——— Marketing ———————————————————————————————————————————————————
  { role: "Marketing Manager", category: "marketing", search: "marketing manager",
    patterns: [/\b(marketing manager|digital marketing|head of marketing|growth marketer|performance marketer|cmo)\b/i] },
  { role: "SEO Specialist", category: "marketing", search: "SEO",
    patterns: [/\b(seo specialist|seo manager|search engine|sem specialist|ppc)\b/i] },
  { role: "Content Marketer", category: "marketing", search: "content marketing",
    patterns: [/\b(content marketer|content strategist|brand manager|social media manager|community manager)\b/i] },

  // ——— HR —————————————————————————————————————————————————————─
  { role: "HR Manager", category: "hr", search: "HR manager",
    patterns: [/\b(hr manager|human resources manager|people manager|chief people|head of hr)\b/i] },
  { role: "Recruiter", category: "hr", search: "recruiter",
    patterns: [/\b(recruiter|talent acquisition|talent sourcer|technical recruiter|headhunter)\b/i] },

  // ——— Customer Support ——————————————————————————————————————————————
  { role: "Customer Success Manager", category: "customer-support", search: "customer success",
    patterns: [/\b(customer success|account manager|client manager|customer experience|cx manager)\b/i] },
  { role: "Support Agent", category: "customer-support", search: "customer support",
    patterns: [/\b(customer support|help desk|support agent|technical support|service desk)\b/i] },

  // ——— Sales ———————————————————————————————————————————————————─
  { role: "Sales Manager", category: "business", search: "sales manager",
    patterns: [/\b(sales manager|head of sales|vp of sales|director of sales|chief revenue)\b/i] },
  { role: "Account Executive", category: "business", search: "account executive",
    patterns: [/\b(account executive|business development|bdr|sdr|sales representative|sales rep|closing rep)\b/i] },

  // ——— Writing ———————————————————————————————————————————————————─
  { role: "Technical Writer", category: "writing", search: "technical writer",
    patterns: [/\b(technical writer|documentation writer|api writer|technical documentation)\b/i] },
  { role: "Content Writer", category: "writing", search: "content writer",
    patterns: [/\b(content writer|copywriter|blogger|journalist|editor|ghostwriter)\b/i] },

  // ——— QA ————————————————————————————————————————————————————─
  { role: "QA Engineer", category: "qa", search: "QA engineer",
    patterns: [/\b(qa engineer|quality assurance|automation tester|sdet|test engineer|manual tester)\b/i] },

  // ——— Education ——————————————————————————————————————————————————─
  { role: "Teacher", category: "education", search: "teacher",
    patterns: [/\b(teacher|educator|instructor|professor|tutor|lecturer|trainer|e-learning)\b/i] },
];

// ─── Extract actual job title from structured CV data ─────────────────────────────────────────
// structured_data is far more reliable than raw text — it\'s the parsed version.

function extractJobTitle(structured: Record<string, unknown>): string {
  const info = structured?.personal_info as Record<string, unknown> | undefined;

  // Common field names for current job title in structured CV data
  const directFields = [
    info?.job_title,
    info?.current_title,
    info?.title,
    info?.position,
    info?.headline,
    info?.current_position,
    info?.professional_title,
    info?.designation,
  ];

  for (const f of directFields) {
    if (typeof f === "string" && f.trim()) return f.trim();
  }

  // Fall back to most recent experience entry
  const exp = structured?.experience;
  if (Array.isArray(exp) && exp.length > 0) {
    const first = exp[0] as Record<string, unknown>;
    const expFields = [first?.position, first?.title, first?.role, first?.job_title];
    for (const f of expFields) {
      if (typeof f === "string" && f.trim()) return f.trim();
    }
  }

  return "";
}

function detectRole(text: string): RoleMapping | null {
  const t = text.toLowerCase();
  for (const mapping of ROLE_MAP) {
    for (const re of mapping.patterns) {
      if (re.test(t)) return mapping;
    }
  }
  return null;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const cvId = parseInt(String(body?.cv_id ?? ""), 10);
    if (!cvId || isNaN(cvId)) return NextResponse.json({ detail: "cv_id is required" }, { status: 400 });

    const { data: cv, error: dbError } = await supabase
      .from("cvs")
      .select("id, extracted_cv, structured_data")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !cv) return NextResponse.json({ detail: "CV not found" }, { status: 404 });

    const structured  = (cv.structured_data as Record<string, unknown>) || {};
    const rawText     = ((cv.extracted_cv as Record<string, unknown>)?.raw_text as string) || "";

    // Priority 1: structured job title (most reliable)
    const structuredTitle = extractJobTitle(structured);
    let detected: RoleMapping | null = null;

    if (structuredTitle) {
      detected = detectRole(structuredTitle);
    }

    // Priority 2: scan raw CV text (broader context)
    if (!detected && rawText) {
      detected = detectRole(rawText);
    }

    if (!detected) {
      return NextResponse.json({
        suggested_query: "",
        detected_role: "",
        category_slug: "",
        confidence: 0,
        detail: "Could not infer a job role from this CV. Use the search bar.",
      }, { status: 200 });
    }

    return NextResponse.json({
      suggested_query: detected.search,
      detected_role:   detected.role,
      category_slug:   detected.category,
      confidence:      structuredTitle ? 0.90 : 0.65,
    }, { status: 200 });

  } catch (err: any) {
    console.error("[suggest-job-query] error:", err?.message);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
