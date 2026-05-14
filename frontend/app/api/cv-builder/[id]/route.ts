/**
 * GET /api/cv-builder/:id
 * Used by the editor page as its fallback load call.
 * Proxies to /api/cv-builder/drafts/:id logic directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("cv_builder_drafts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error || !data) return NextResponse.json({ detail: "Draft not found" }, { status: 404 });

    // Reshape to match the CvDraft interface the editor expects
    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      data: data.data,
      design: data.design,
      sectionOrder: data.section_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }, { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/[id] GET]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
