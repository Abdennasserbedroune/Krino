import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

/** GET /api/cv-builder/drafts/:id */
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
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/drafts/[id] GET]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}

/** PATCH /api/cv-builder/drafts/:id — save draft (manual save, no autosave) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Only allow updating safe fields
    const allowed = ["title", "template", "data", "design", "section_order"];
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    const { data, error } = await supabase
      .from("cv_builder_drafts")
      .update(patch)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ detail: "Draft not found or update failed" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("[cv-builder/drafts/[id] PATCH]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/cv-builder/drafts/:id — soft delete */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("cv_builder_drafts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[cv-builder/drafts/[id] DELETE]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
