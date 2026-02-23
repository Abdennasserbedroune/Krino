import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        environment: {
            node_env: process.env.NODE_ENV,
            vercel_env: process.env.VERCEL_ENV,
            region: process.env.VERCEL_REGION,
        },
        env_vars: {
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
            supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
            groq_api_key: process.env.GROQ_API_KEY ? "✅ Set" : "❌ Missing",
            nextauth_secret: process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing",
            nextauth_url: process.env.NEXTAUTH_URL ? "✅ Set" : "❌ Missing",
        },
        tests: {}
    };

    // Test 1: Supabase Connection
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            diagnostics.tests.auth = {
                status: "error",
                message: authError.message
            };
        } else {
            diagnostics.tests.auth = {
                status: "ok",
                authenticated: !!user,
                user_id: user?.id || null
            };
        }
    } catch (error: any) {
        diagnostics.tests.auth = {
            status: "error",
            message: error.message
        };
    }

    // Test 2: Database Connection (try to query cvs table structure)
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("cvs")
            .select("count")
            .limit(1);

        if (error) {
            diagnostics.tests.database = {
                status: "error",
                message: error.message,
                hint: "Make sure the 'cvs' table exists. See SUPABASE_SETUP.md"
            };
        } else {
            diagnostics.tests.database = {
                status: "ok",
                message: "Connected to cvs table"
            };
        }
    } catch (error: any) {
        diagnostics.tests.database = {
            status: "error",
            message: error.message
        };
    }

    // Test 3: Storage Connection
    try {
        const supabase = createClient();
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            diagnostics.tests.storage = {
                status: "error",
                message: error.message
            };
        } else {
            const cvsBucket = buckets.find(b => b.name === "cvs");
            diagnostics.tests.storage = {
                status: "ok",
                buckets: buckets.map(b => b.name),
                cvs_bucket_exists: !!cvsBucket,
                cvs_bucket_public: cvsBucket?.public || false
            };
        }
    } catch (error: any) {
        diagnostics.tests.storage = {
            status: "error",
            message: error.message
        };
    }

    // Determine overall status
    const allOk = Object.values(diagnostics.tests).every((t: any) => t.status === "ok");
    diagnostics.overall_status = allOk ? "healthy" : "issues_detected";

    return NextResponse.json(diagnostics, { 
        status: allOk ? 200 : 500 
    });
}
