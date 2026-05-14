"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Format = "pdf" | "json";

const FORMATS = [
  {
    id: "pdf" as Format,
    icon: FileText,
    label: "PDF",
    description: "Best for applying — pixel-perfect, ATS-safe",
    cta: "Download PDF",
  },
  {
    id: "json" as Format,
    icon: FileJson,
    label: "JSON Resume",
    description: "Portable data — import into other tools",
    cta: "Export JSON",
  },
];

export function ExportSection() {
  const draft = useCvBuilderStore((s) => s.draft);
  const [loading, setLoading] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: Format) => {
    if (!draft) return;
    setLoading(format);
    setError(null);
    try {
      if (format === "json") {
        const blob = new Blob(
          [JSON.stringify(draft.data, null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${draft.title.replace(/\s+/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Backend returns HTML — open in new tab and trigger browser print
        const res = await fetch(
          `/api/cv-builder/drafts/${draft.id}/export/pdf`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const html = await res.text();
        const win = window.open("", "_blank");
        if (!win) throw new Error("Popup blocked — please allow popups for this site");
        win.document.write(html);
        win.document.close();
        // Small delay so the page renders before print dialog
        setTimeout(() => win.print(), 400);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
        Export Resume
      </label>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {FORMATS.map((fmt) => (
          <div
            key={fmt.id}
            className="flex items-center gap-3 rounded-xl border border-border p-3 bg-background hover:bg-muted/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <fmt.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{fmt.label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{fmt.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport(fmt.id)}
              disabled={loading === fmt.id}
              className="shrink-0 h-8 text-xs"
            >
              {loading === fmt.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1" />
              )}
              {loading === fmt.id ? "Preparing…" : fmt.cta}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        PDF export opens a print dialog in a new tab. Use <strong>Save as PDF</strong> in your browser's print settings.
      </p>
    </div>
  );
}
