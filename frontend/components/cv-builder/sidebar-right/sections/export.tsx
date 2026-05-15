"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Download, FileJson, FileText, Loader2, Printer } from "lucide-react";

type Format = "pdf" | "json";

export function ExportSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [loading, setLoading] = useState<Format | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handlePdf = async () => {
    if (!draft) return;
    setLoading("pdf"); setError(null);
    try {
      // Grab the live artboard DOM — the actual rendered template the user modified
      const artboard = document.querySelector<HTMLElement>("[data-artboard]");
      if (!artboard) throw new Error("Artboard not found. Make sure the canvas is visible.");

      const html = artboard.innerHTML;
      // Collect all <style> and <link rel=stylesheet> from the current page
      const styles = Array.from(document.querySelectorAll<HTMLElement>("style, link[rel='stylesheet']"))
        .map(el => el.outerHTML)
        .join("\n");

      const printDoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${draft.title ?? "Resume"}</title>
${styles}
<style>
  @page { size: A4; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; background: white; }
</style>
</head>
<body>
  ${html}
</body>
</html>`;

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) throw new Error("Popup blocked — allow popups for this site then try again.");
      win.document.open();
      win.document.write(printDoc);
      win.document.close();
      // Wait for fonts + images to settle before triggering print
      setTimeout(() => {
        win.focus();
        win.print();
        // Close the helper tab after the user acts on the print dialog
        win.addEventListener("afterprint", () => win.close());
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setLoading(null);
    }
  };

  const handleJson = () => {
    if (!draft) return;
    setLoading("json"); setError(null);
    try {
      const blob = new Blob([JSON.stringify(draft.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(draft.title || "resume").replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON export failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">Export Resume</span>

      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-2.5 py-1.5">{error}</p>}

      {/* PDF */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border p-3 bg-background">
        <div className="w-8 h-8 rounded-lg bg-[#111827]/8 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-[#111827] dark:text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">PDF</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Prints your exact template</p>
        </div>
        <button
          onClick={handlePdf}
          disabled={loading === "pdf"}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-[#111827] text-white hover:bg-[#1f2937] disabled:opacity-50 transition-colors shrink-0"
        >
          {loading === "pdf" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
          {loading === "pdf" ? "…" : "Print / Save"}
        </button>
      </div>

      {/* JSON */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border p-3 bg-background">
        <div className="w-8 h-8 rounded-lg bg-[#111827]/8 flex items-center justify-center shrink-0">
          <FileJson className="h-4 w-4 text-[#111827] dark:text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">JSON Resume</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Portable — import elsewhere</p>
        </div>
        <button
          onClick={handleJson}
          disabled={loading === "json"}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
        >
          {loading === "json" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {loading === "json" ? "…" : "Download"}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground px-0.5 leading-relaxed">
        PDF opens a print dialog. Choose <strong>Save as PDF</strong> as the destination.
      </p>
    </div>
  );
}
