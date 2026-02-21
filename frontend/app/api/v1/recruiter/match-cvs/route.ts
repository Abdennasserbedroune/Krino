import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60; // 60s limit on Vercel Hobby

const YEARS_REGEX = /(\d{1,2})\+?\s+years?/i;

const DOMAIN_KEYWORDS: Record<string, string[]> = {
    "ai & data": ["data", "analytics", "machine learning", "ml", "ai", "python", "sql"],
    "software engineering": [
        "software",
        "developer",
        "engineer",
        "javascript",
        "typescript",
        "react",
        "node",
        "java",
        "c#",
        "c++",
    ],
    "product management": ["product manager", "roadmap", "backlog", "stakeholder", "kpi"],
    "marketing & growth": ["marketing", "campaign", "seo", "sem", "growth", "branding"],
    "finance & banking": ["finance", "financial", "bank", "investment", "valuation"],
    "design & ux": ["design", "designer", "ux", "ui", "figma", "wireframe", "prototype", "adobe"],
};

function parseYearsExperience(text: string): number {
    if (!text) return 0;
    // Regex matches globally for any digits before "years" or "year"
    const matches = [...text.matchAll(/(\d{1,2})\+?\s+years?/gi)];
    if (!matches.length) return 0;

    let maxYears = 0;
    for (const match of matches) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxYears) {
            maxYears = num;
        }
    }
    return maxYears;
}

function parseRequiredYears(rangeStr: string): number {
    if (!rangeStr) return 0;
    const digits = rangeStr.match(/\d+/g);
    if (!digits || !digits.length) return 0;
    if (digits.length === 1) return parseInt(digits[0], 10);
    // Average
    const low = parseInt(digits[0], 10);
    const high = parseInt(digits[1], 10);
    return Math.floor((low + high) / 2);
}

function computeExperienceScore(candidateYears: number, jobExperienceRange: string): number {
    const required = parseRequiredYears(jobExperienceRange);
    if (required <= 0) return 60;

    if (candidateYears <= 0) return 30;
    if (candidateYears < required) {
        const shortfall = required - candidateYears;
        if (shortfall >= 4) return 20;
        if (shortfall >= 2) return 35;
        return 50;
    }
    const extra = candidateYears - required;
    if (extra <= 1) return 90;
    if (extra <= 3) return 80;
    return 70;
}

function normaliseDomain(domain: string): string {
    const d = (domain || "").trim().toLowerCase();
    for (const key of Object.keys(DOMAIN_KEYWORDS)) {
        if (d.includes(key)) return key;
    }
    return d;
}

function computeDomainMatchScore(domain: string, rawText: string): number {
    const base = normaliseDomain(domain);
    const keywords = DOMAIN_KEYWORDS[base];
    if (!keywords || keywords.length === 0) return 60;

    const textLower = (rawText || "").toLowerCase();
    const hits = keywords.filter(kw => textLower.includes(kw)).length;

    if (hits === 0) return 20;
    const ratio = hits / keywords.length;
    return Math.max(30, Math.min(95, Math.floor(ratio * 100)));
}

function computeSkillsOverlapScore(jobSkillsText: string, cvSkills: any): number {
    const jobText = (jobSkillsText || "").toLowerCase();
    if (!jobText) return 60;

    const splitTokens = (txt: string) => txt.split(/[,;/]/).map(t => t.trim()).filter(Boolean);
    const jobTokens = new Set(splitTokens(jobText));

    let cvTokens: string[] = [];
    if (Array.isArray(cvSkills)) {
        for (const item of cvSkills) {
            if (typeof item === 'string') {
                cvTokens.push(...item.toLowerCase().split(',').map(t => t.trim()));
            }
        }
    } else if (typeof cvSkills === 'object' && cvSkills !== null) {
        for (const value of Object.values(cvSkills)) {
            if (typeof value === 'string') {
                cvTokens.push(...value.toLowerCase().split(',').map(t => t.trim()));
            } else if (Array.isArray(value)) {
                for (const v of value) {
                    if (typeof v === 'string') {
                        cvTokens.push(...v.toLowerCase().split(',').map(t => t.trim()));
                    }
                }
            }
        }
    }

    const cvSet = new Set(cvTokens.filter(Boolean));
    if (jobTokens.size === 0 || cvSet.size === 0) return 50;

    let intersectionCount = 0;
    for (const jobToken of jobTokens) {
        if (cvSet.has(jobToken)) intersectionCount++;
    }

    if (intersectionCount === 0) return 25;
    const ratio = intersectionCount / jobTokens.size;
    return Math.max(40, Math.min(95, Math.floor(ratio * 100)));
}

function combineScores(domainScore: number, experienceScore: number, skillsScore: number, cvQualityScore: number): number {
    const total =
        0.4 * domainScore +
        0.3 * experienceScore +
        0.2 * skillsScore +
        0.1 * cvQualityScore;
    return Math.max(0, Math.min(100, Math.floor(total)));
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { job, cv_ids } = body;

        if (!cv_ids || !Array.isArray(cv_ids) || cv_ids.length === 0) {
            return NextResponse.json({ detail: "At least one CV id is required." }, { status: 400 });
        }
        if (cv_ids.length > 5) {
            return NextResponse.json({ detail: "You can match at most 5 CVs at a time." }, { status: 400 });
        }

        // Fetch CVs
        const { data: cvs, error: dbError } = await supabase
            .from("cvs")
            .select("*")
            .eq("user_id", user.id)
            .in("id", cv_ids);

        if (dbError || !cvs || cvs.length === 0) {
            return NextResponse.json({ detail: "No CVs found for this user." }, { status: 404 });
        }

        const foundIds = new Set(cvs.map(c => c.id));
        const missing = cv_ids.filter(id => !foundIds.has(id));
        if (missing.length > 0) {
            return NextResponse.json({ detail: `Some CVs were not found: ${missing.join(", ")}` }, { status: 404 });
        }

        // Prepare job summary
        const parts = [];
        if (job.domain) parts.push(`Domain: ${job.domain}`);
        if (job.experience_range) parts.push(`Experience range: ${job.experience_range}`);
        if (job.salary_range) parts.push(`Salary range: ${job.salary_range}`);
        if (job.location) parts.push(`Location: ${job.location}`);
        if (job.contract_type) parts.push(`Contract type: ${job.contract_type}`);
        if (job.skills_text) parts.push(`Key skills: ${job.skills_text}`);
        const jobSummary = parts.join(" | ");

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const results = [];

        // We run these matches in parallel
        await Promise.all(cvs.map(async (cv) => {
            let rawText = cv.extracted_cv?.raw_text || "";
            if (!rawText) rawText = JSON.stringify(cv.extracted_cv || {});

            const analysis = cv.analysis_result || {};
            const structured = cv.structured_data || {};

            const candidateYears = parseYearsExperience(rawText);
            const experienceScore = computeExperienceScore(candidateYears, job.experience_range || "");
            const domainScore = computeDomainMatchScore(job.domain || "", rawText);
            const skillsScore = computeSkillsOverlapScore(job.skills_text || "", structured.skills || {});

            const cvQualityScore = parseInt(analysis.score || cv.score || 0, 10);

            const totalScore = combineScores(domainScore, experienceScore, skillsScore, cvQualityScore);

            const cvSummaryText = rawText.substring(0, 4000);

            let reasonsDict: any = {
                overall_reason: "Unable to generate AI explanation.",
                strengths: [],
                risks: []
            };

            try {
                const systemPrompt = `You are an expert technical recruiter. Compare one job profile with one candidate CV and explain the fit. Always be honest if the CV does NOT match the job (wrong domain or too little experience).`;
                const userPrompt = `=== JOB PROFILE ===
${jobSummary}

=== CANDIDATE CV (TEXT SUMMARY) ===
${cvSummaryText}

Return a JSON object with exactly these keys:
overall_reason: short paragraph (2-3 sentences) summarising fit or mismatch.
strengths: list of bullet strings describing why the profile fits.
risks: list of bullet strings describing gaps or reasons it may not fit.`;

                const response = await groq.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.4,
                    response_format: { type: "json_object" },
                    max_tokens: 1200,
                });

                const content = response.choices[0]?.message?.content?.trim();
                if (content) {
                    reasonsDict = JSON.parse(content);
                }
            } catch (error) {
                console.error("Groq match failed:", error);
            }

            results.push({
                cv_id: cv.id,
                file_name: cv.original_filename,
                match_score: totalScore,
                skills_match_score: skillsScore,
                experience_score: experienceScore,
                cv_quality_score: cvQualityScore,
                reasons: {
                    overall_reason: reasonsDict.overall_reason || "No explanation available.",
                    strengths: reasonsDict.strengths || [],
                    risks: reasonsDict.risks || []
                }
            });
        }));

        results.sort((a, b) => b.match_score - a.match_score);

        return NextResponse.json({ job: job, results: results }, { status: 200 });

    } catch (error: any) {
        console.error("Match Handler error:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
