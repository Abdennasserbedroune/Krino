import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    let filePath: string | null = null;

    try {
        // ── Step 1: Auth ──────────────────────────────────────────────────────
        console.log("[cv/upload] step=auth");
        let supabase: ReturnType<typeof createClient>;
        try {
            supabase = createClient();
        } catch (e: any) {
            console.error("[cv/upload] step=auth failed to create client:", e?.message);
            throw e;
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn("[cv/upload] step=auth unauthorized:", authError?.message);
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }
        console.log("[cv/upload] step=auth ok, userId=", user.id);

        // ── Step 2: Parse form data ───────────────────────────────────────────
        console.log("[cv/upload] step=formData");
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e: any) {
            console.error("[cv/upload] step=formData parse error:", e?.message);
            return NextResponse.json({ detail: "Invalid form data" }, { status: 400 });
        }

        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
            return NextResponse.json(
                { detail: "Unsupported file type. Allowed: pdf, docx, doc, txt" },
                { status: 400 }
            );
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ detail: "File too large (max 5MB)" }, { status: 400 });
        }
        console.log("[cv/upload] step=formData ok, file=", file.name, "ext=", ext, "size=", file.size);

        // ── Step 3: Duplicate check ───────────────────────────────────────────
        console.log("[cv/upload] step=duplicateCheck");
        const { data: existingCv } = await supabase
            .from("cvs")
            .select("id")
            .eq("user_id", user.id)
            .eq("original_filename", file.name)
            .single();

        if (existingCv) {
            return NextResponse.json(
                { detail: `A file with the name '${file.name}' already exists. Please rename or delete the existing file.` },
                { status: 409 }
            );
        }

        // ── Step 4: Read buffer ───────────────────────────────────────────────
        console.log("[cv/upload] step=readBuffer");
        filePath = `${user.id}/${Date.now()}_${file.name}`;
        let buffer: Buffer;
        try {
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (e: any) {
            console.error("[cv/upload] step=readBuffer error:", e?.message);
            throw e;
        }

        // ── Step 5: Storage upload ────────────────────────────────────────────
        console.log("[cv/upload] step=storageUpload, path=", filePath);
        const { error: uploadError } = await supabase.storage
            .from("cvs")
            .upload(filePath, buffer, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
            });

        if (uploadError) {
            console.error("[cv/upload] step=storageUpload failed:", uploadError.message);
            filePath = null; // nothing to clean up
            return NextResponse.json({ detail: "Failed to upload file to storage: " + uploadError.message }, { status: 500 });
        }
        console.log("[cv/upload] step=storageUpload ok");

        // ── Step 6: Parse content (non-fatal) ─────────────────────────────────
        console.log("[cv/upload] step=parse, ext=", ext);
        let rawText = "";
        let isScanned = false;
        let pageCount = 1;

        try {
            if (ext === "pdf") {
                // pdf-parse's default index.js tries to load a test file at import
                // time which doesn't exist in Vercel's bundle. Import the lib directly.
                const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
                const pdfData = await pdfParse(buffer);
                rawText = pdfData.text || "";
                pageCount = pdfData.numpages || 1;
                if (rawText.trim().length < 50) {
                    isScanned = true;
                }
                console.log("[cv/upload] step=parse pdf ok, pages=", pageCount, "chars=", rawText.length);
            } else if (ext === "docx" || ext === "doc") {
                const mammoth = (await import("mammoth")).default;
                const result = await mammoth.extractRawText({ buffer });
                rawText = result.value || "";
                console.log("[cv/upload] step=parse docx ok, chars=", rawText.length);
            } else if (ext === "txt") {
                rawText = buffer.toString("utf-8");
                console.log("[cv/upload] step=parse txt ok, chars=", rawText.length);
            }
        } catch (parseError: any) {
            // Parsing failure is non-fatal — we still save the file metadata
            console.error("[cv/upload] step=parse FAILED (non-fatal):", parseError?.message, parseError?.stack);
        }

        // ── Step 7: Page count guard ──────────────────────────────────────────
        if (pageCount > 5) {
            console.warn("[cv/upload] step=pageGuard too many pages:", pageCount);
            await supabase.storage.from("cvs").remove([filePath]);
            filePath = null;
            return NextResponse.json({ detail: "File has too many pages (max 5)" }, { status: 400 });
        }

        // ── Step 8: DB insert ─────────────────────────────────────────────────
        console.log("[cv/upload] step=dbInsert");
        const wordCount = rawText.split(/\s+/).filter(Boolean).length;
        const baseScore = Math.min(60, Math.floor(wordCount / 10));

        const { data: newCv, error: dbError } = await supabase
            .from("cvs")
            .insert({
                user_id: user.id,
                original_filename: file.name,
                file_path: filePath,
                file_type: ext,
                file_size: file.size,
                extracted_cv: {
                    raw_text: rawText,
                    is_scanned: isScanned,
                    page_count: pageCount,
                },
                analysis_result: {
                    score: baseScore,
                    word_count: wordCount,
                    readability_score: 50,
                },
                score: baseScore,
                structured_data: {
                    skills: { Extracted: [] },
                },
            })
            .select()
            .single();

        if (dbError || !newCv) {
            console.error("[cv/upload] step=dbInsert FAILED:", dbError?.message, dbError?.details);
            await supabase.storage.from("cvs").remove([filePath]);
            filePath = null;
            return NextResponse.json(
                { detail: "Failed to save CV record: " + (dbError?.message ?? "unknown") },
                { status: 500 }
            );
        }

        console.log("[cv/upload] step=done, cvId=", newCv.id);
        return NextResponse.json(newCv, { status: 201 });

    } catch (error: any) {
        // Last-resort cleanup: remove the file from storage if we uploaded it
        if (filePath) {
            try {
                const supabase = createClient();
                await supabase.storage.from("cvs").remove([filePath]);
            } catch (_) { /* best effort */ }
        }
        console.error("[cv/upload] UNHANDLED ERROR:", error?.message, "\nStack:", error?.stack);
        return NextResponse.json(
            { detail: error?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
