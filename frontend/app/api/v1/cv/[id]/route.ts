import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    } catch (error: any) {
        console.error("GET CV handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
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

        // Fetch to get the file path first so we can delete from storage
        const { data: cv, error: dbError } = await supabase
            .from("cvs")
            .select("file_path")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        // Delete from DB first
        const { error: deleteError } = await supabase
            .from("cvs")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (deleteError) {
            console.error("DB Error deleting CV:", deleteError);
            return NextResponse.json({ detail: "Failed to delete from database" }, { status: 500 });
        }

        // Delete from Storage
        if (cv.file_path) {
            await supabase.storage.from("cvs").remove([cv.file_path]);
        }

        return new NextResponse(null, { status: 204 }); // 204 No Content

    } catch (error: any) {
        console.error("DELETE CV handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
