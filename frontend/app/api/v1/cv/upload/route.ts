import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
            return NextResponse.json({ detail: `Unsupported file type. Allowed: pdf, docx, doc, txt` }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ detail: "File too large (max 5MB)" }, { status: 400 });
        }

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

        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase
            .storage
            .from("cvs")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error("Storage upload failed:", uploadError);
            return NextResponse.json({ detail: "Failed to upload file to storage" }, { status: 500 });
        }

        let rawText = "";
        let isScanned = false;
        let pageCount = 1;

        try {
            if (ext === "pdf") {
                const pdfData = await pdfParse(buffer);
                rawText = pdfData.text || "";
                pageCount = pdfData.numpages || 1;
                if (rawText.trim().length < 50) {
                    isScanned = true;
                }
            } else if (ext === "docx" || ext === "doc") {
                const result = await mammoth.extractRawText({ buffer });
                rawText = result.value || "";
            } else if (ext === "txt") {
                rawText = buffer.toString("utf-8");
            }
        } catch (parseError) {
            console.error("Parsing failed:", parseError);
        }

        if (pageCount > 5) {
            await supabase.storage.from("cvs").remove([filePath]);
            return NextResponse.json({ detail: "File has too many pages (max 5)" }, { status: 400 });
        }

        const wordCount = rawText.split(/\s+/).filter(Boolean).length;
        const baseScore = Math.min(60, Math.floor(wordCount / 10));

        const extractedData = {
            raw_text: rawText,
            is_scanned: isScanned,
            page_count: pageCount
        };

        const analysisResult = {
            score: baseScore,
            word_count: wordCount,
            readability_score: 50,
        };

        const structuredData = {
            skills: { "Extracted": [] }
        };

        const { data: newCv, error: dbError } = await supabase
            .from("cvs")
            .insert({
                user_id: user.id,
                original_filename: file.name,
                file_path: filePath,
                file_type: ext,
                file_size: file.size,
                extracted_cv: extractedData,
                analysis_result: analysisResult,
                score: baseScore,
                structured_data: structuredData,
            })
            .select()
            .single();

        if (dbError || !newCv) {
            console.error("DB Insert failed:", dbError);
            await supabase.storage.from("cvs").remove([filePath]);
            return NextResponse.json({ detail: "Failed to save CV record" }, { status: 500 });
        }

        return NextResponse.json(newCv, { status: 201 });

    } catch (error: any) {
        console.error("Upload handler failed:", error);
        return NextResponse.json({ detail: error.message || String(error), stack: error.stack }, { status: 500 });
    }
}
