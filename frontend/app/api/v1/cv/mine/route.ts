import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const { data: cvs, error: dbError } = await supabase
            .from("cvs")
            .select("*")
            .eq("user_id", user.id)
            // Order by creation date descending, assuming 'id' increments or we have created_at
            .order("id", { ascending: false });

        if (dbError) {
            console.error("DB Error fetching CVs:", dbError);
            return NextResponse.json({ detail: "Failed to fetch CVs" }, { status: 500 });
        }

        return NextResponse.json(cvs || [], { status: 200 });

    } catch (error: any) {
        console.error("Fetch CVs handler failed:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
