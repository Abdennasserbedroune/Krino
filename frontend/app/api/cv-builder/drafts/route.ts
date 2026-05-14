import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/cv-builder/drafts — list all active drafts for the current user */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("cv_builder_drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/drafts GET]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}

/** POST /api/cv-builder/drafts — create a new draft */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, title, template, data, design, section_order } = body;

    if (!id) return NextResponse.json({ detail: "id is required" }, { status: 400 });

    const { data: draft, error } = await supabase
      .from("cv_builder_drafts")
      .insert({
        id,
        user_id: user.id,
        title: title ?? "Untitled Resume",
        template: template ?? "modern",
        data: data ?? {},
        design: design ?? {},
        section_order: section_order ?? [],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(draft, { status: 201 });
  } catch (err: any) {
    console.error("[cv-builder/drafts POST]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
