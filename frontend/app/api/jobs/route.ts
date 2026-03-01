import { NextRequest, NextResponse } from "next/server";

const REMOTIVE_BASE = "https://remotive.com/api/remote-jobs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search   = (searchParams.get("search")   ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const limit    = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const url = new URL(REMOTIVE_BASE);
  // When category is provided, Remotive filters by field — much more accurate than search alone.
  // When both are provided, Remotive applies both (category filter + text search within it).
  if (category) url.searchParams.set("category", category);
  if (search)   url.searchParams.set("search",   search);
  url.searchParams.set("limit", String(limit));

  try {
    const res = await fetch(url.toString(), {
      // 5-minute cache — Remotive advises max 4 fetches/day; this is already generous.
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Remotive returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const jobs = Array.isArray(data) ? data
      : Array.isArray(data?.jobs) ? data.jobs
      : [];
    const jobCount: number = typeof data?.["job-count"] === "number" ? data["job-count"] : jobs.length;

    return NextResponse.json({ jobs, job_count: jobCount }, { status: 200 });
  } catch (err) {
    console.error("[api/jobs] Remotive fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch jobs. Please try again.", jobs: [] }, { status: 500 });
  }
}
