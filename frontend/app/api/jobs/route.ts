import { NextRequest, NextResponse } from "next/server";

const REMOTIVE_BASE = "https://remotive.com/api/remote-jobs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search   = (searchParams.get("search") ?? "").trim();
  const limit    = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const url = new URL(REMOTIVE_BASE);
  if (search) url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));

  try {
    const res = await fetch(url.toString(), {
      // Cache for 5 minutes — Remotive doesn’t update more often than that
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

    // Normalise the response shape so the frontend never breaks
    // if Remotive changes their envelope.
    const jobs = Array.isArray(data)
      ? data
      : Array.isArray(data?.jobs)
      ? data.jobs
      : [];

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (err) {
    console.error("[jobs/route] Remotive fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch jobs. Please try again.", jobs: [] },
      { status: 500 },
    );
  }
}
