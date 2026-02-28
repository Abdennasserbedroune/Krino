import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
        }

        const { data: cv, error: dbError } = await supabase
            .from("cvs")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        return NextResponse.json(cv, { status: 200 });

    } catch (error: unknown) {
        console.error("GET CV handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Verify the caller is authenticated (anon + cookie session)
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
        }

        // 2. Verify ownership using the user's own session (RLS SELECT is fine)
        const { data: cv, error: dbError } = await supabase
            .from("cvs")
            .select("file_path")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            console.error("[delete-cv] ownership check failed:", dbError?.message);
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        // 3. Perform the actual delete using the service-role admin client
        //    so that RLS policies on the cvs table cannot block it.
        //    Ownership has already been verified above.
        const admin = createAdminClient();

        const { error: deleteError } = await admin
            .from("cvs")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("[delete-cv] DB delete failed:", deleteError.message, deleteError.details);
            return NextResponse.json(
                { detail: "Failed to delete CV: " + deleteError.message },
                { status: 500 }
            );
        }

        // 4. Remove file from storage (best-effort — don't fail the request if this errors)
        if (cv.file_path) {
            const { error: storageError } = await admin.storage
                .from("cvs")
                .remove([cv.file_path]);
            if (storageError) {
                console.warn("[delete-cv] storage remove failed (non-fatal):", storageError.message);
            }
        }

        return new NextResponse(null, { status: 204 });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[delete-cv] unhandled error:", msg);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
