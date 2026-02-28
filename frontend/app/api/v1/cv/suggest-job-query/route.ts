import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function guessQueryFromCv(rawText: string, fallbackCategory?: string) {
  const t = (rawText || "").toLowerCase();

  const patterns: Array<{ role: string; query: string; re: RegExp }> = [
    { role: "Product Manager", query: "product manager", re: /\b(product manager|product management|pm)\b/i },
    { role: "Data Analyst", query: "data analyst", re: /\b(data analyst|business analyst|bi analyst|power bi|tableau)\b/i },
    { role: "Machine Learning Engineer", query: "machine learning engineer", re: /\b(machine learning engineer|ml engineer|deep learning|nlp|computer vision)\b/i },
    { role: "DevOps Engineer", query: "devops engineer", re: /\b(devops|site reliability|sre|kubernetes|terraform|ci\/cd)\b/i },
    { role: "Frontend Developer", query: "frontend developer", re: /\b(frontend|front-end|react|next\.js|vue|angular)\b/i },
    { role: "Backend Developer", query: "backend developer", re: /\b(backend|back-end|api|node\.js|django|spring boot|microservices)\b/i },
    { role: "Full Stack Developer", query: "full stack developer", re: /\b(full\s*stack|full-stack)\b/i },
    { role: "Software Engineer", query: "software engineer", re: /\b(software engineer|software developer)\b/i },
    { role: "UX Designer", query: "ux designer", re: /\b(ux designer|ui\/ux|product designer|figma)\b/i },
  ];

  for (const p of patterns) {
    if (p.re.test(t)) return { role: p.role, query: p.query, confidence: 0.75 };
  }

  const cat = (fallbackCategory || "").toLowerCase();
  if (cat.includes("product")) return { role: "Product Manager", query: "product manager", confidence: 0.4 };
  if (cat.includes("ai") || cat.includes("data")) return { role: "Data Analyst", query: "data analyst", confidence: 0.4 };
  if (cat.includes("software")) return { role: "Software Engineer", query: "software engineer", confidence: 0.35 };

  return { role: "", query: "", confidence: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const cvId = parseInt(String(body?.cv_id ?? ""), 10);
    const fallbackCategory = typeof body?.job_category === "string" ? body.job_category : "";

    if (!cvId || Number.isNaN(cvId)) {
      return NextResponse.json({ detail: "cv_id is required" }, { status: 400 });
    }

    const { data: cv, error: dbError } = await supabase
      .from("cvs")
      .select("id, extracted_cv")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !cv) {
      return NextResponse.json({ detail: "CV not found" }, { status: 404 });
    }

    const rawText = (cv.extracted_cv as any)?.raw_text ?? "";
    const guess = guessQueryFromCv(rawText, fallbackCategory);

    if (!guess.query) {
      return NextResponse.json(
        { suggested_query: "", detected_role: "", confidence: 0, detail: "Could not infer a job role from this CV" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { suggested_query: guess.query, detected_role: guess.role, confidence: guess.confidence },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[cv/suggest-job-query] error:", err?.message);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
