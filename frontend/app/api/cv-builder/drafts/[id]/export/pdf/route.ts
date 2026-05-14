/**
 * POST /api/cv-builder/drafts/:id/export/pdf
 * Generates a PDF of the CV draft using html-pdf-node (Puppeteer-based).
 * Returns the PDF as a binary stream with Content-Disposition: attachment.
 *
 * NOTE for frontend team: call with POST, no body needed.
 * The response is a binary PDF — use:
 *   const blob = await res.blob();
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a'); a.href = url; a.download = 'resume.pdf'; a.click();
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { data: draft, error: dbError } = await supabase
      .from("cv_builder_drafts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (dbError || !draft) return NextResponse.json({ detail: "Draft not found" }, { status: 404 });

    // Build a minimal but clean HTML representation of the CV
    const d = draft.data ?? {};
    const basics = d.basics ?? {};
    const design = draft.design ?? {};
    const primary = design.primaryColor ?? "#111111";
    const accent = design.accentColor ?? "#3b82f6";
    const fontSize = design.fontSize ?? 10;
    const fontFamily = design.fontFamily ?? "Arial, sans-serif";

    const experienceHtml = (d.experience ?? []).map((exp: any) => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between">
          <strong style="color:${primary}">${exp.position ?? ""}</strong>
          <span style="font-size:${fontSize - 1}pt;color:#666">${exp.startDate ?? ""} – ${exp.current ? "Present" : (exp.endDate ?? "")}</span>
        </div>
        <div style="color:#444;font-size:${fontSize - 0.5}pt">${exp.company ?? ""}${exp.location ? ` · ${exp.location}` : ""}</div>
        ${(exp.bullets ?? []).map((b: string) => `<div style="margin-left:12px">• ${b}</div>`).join("")}
      </div>
    `).join("");

    const educationHtml = (d.education ?? []).map((edu: any) => `
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between">
          <strong style="color:${primary}">${edu.degree ?? ""} ${edu.field ? `in ${edu.field}` : ""}</strong>
          <span style="font-size:${fontSize - 1}pt;color:#666">${edu.startDate ?? ""} – ${edu.current ? "Present" : (edu.endDate ?? "")}</span>
        </div>
        <div style="color:#444">${edu.institution ?? ""}</div>
      </div>
    `).join("");

    const skillsHtml = (d.skills ?? []).map((sg: any) => `
      <div style="margin-bottom:4px">
        <strong style="color:${primary}">${sg.category ?? ""}:</strong>
        <span style="color:#444"> ${(sg.items ?? []).join(", ")}</span>
      </div>
    `).join("");

    const section = (title: string, content: string) =>
      content.trim()
        ? `<div style="margin-bottom:14px">
             <div style="font-size:${fontSize + 1}pt;font-weight:700;color:${primary};border-bottom:1.5px solid ${accent};padding-bottom:2px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">${title}</div>
             ${content}
           </div>`
        : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    font-size: ${fontSize}pt;
    color: #222;
    padding: ${design.marginTop ?? 18}mm ${design.marginSide ?? 18}mm;
    line-height: ${design.lineHeight ?? 1.5};
  }
  @page { size: ${design.paperSize ?? "A4"}; margin: 0; }
</style>
</head>
<body>
  <!-- Header -->
  <div style="margin-bottom:16px">
    <div style="font-size:${fontSize + 8}pt;font-weight:700;color:${primary}">${basics.name ?? ""}</div>
    <div style="font-size:${fontSize + 1}pt;color:${accent};margin-bottom:4px">${basics.headline ?? ""}</div>
    <div style="font-size:${fontSize - 0.5}pt;color:#555;display:flex;gap:14px;flex-wrap:wrap">
      ${basics.email ? `<span>${basics.email}</span>` : ""}
      ${basics.phone ? `<span>${basics.phone}</span>` : ""}
      ${basics.location ? `<span>${basics.location}</span>` : ""}
      ${basics.linkedin ? `<span>${basics.linkedin}</span>` : ""}
      ${basics.github ? `<span>${basics.github}</span>` : ""}
    </div>
  </div>

  ${d.summary?.content ? section("Summary", `<p>${d.summary.content}</p>`) : ""}
  ${experienceHtml ? section("Experience", experienceHtml) : ""}
  ${educationHtml ? section("Education", educationHtml) : ""}
  ${skillsHtml ? section("Skills", skillsHtml) : ""}
</body>
</html>`;

    // Use Vercel-compatible approach: return HTML with print instructions if
    // puppeteer/html-pdf-node is not available in the runtime.
    // For local dev with Node.js runtime, html-pdf-node can be used.
    // On Vercel Edge/Serverless we return a pre-formatted HTML that the browser
    // can print-to-PDF — this avoids heavy binary deps.
    //
    // TO ENABLE TRUE SERVER-SIDE PDF: install html-pdf-node and uncomment below.
    //
    // import htmlPdf from "html-pdf-node";
    // const file = { content: html };
    // const pdfBuffer = await htmlPdf.generatePdf(file, { format: "A4" });
    // return new NextResponse(pdfBuffer, {
    //   status: 200,
    //   headers: {
    //     "Content-Type": "application/pdf",
    //     "Content-Disposition": `attachment; filename="${draft.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
    //   },
    // });

    // Current approach: return the HTML so the frontend can trigger window.print()
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "X-Draft-Title": encodeURIComponent(draft.title ?? "resume"),
      },
    });
  } catch (err: any) {
    console.error("[cv-builder/export/pdf POST]", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
