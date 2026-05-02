"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { Download, FileJson, FileText, Copy, Check, Loader2 } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleExport = async (format: Format) => {
    if (!draft) return;
    setLoading(format);
    try {
      if (format === "json") {
        const blob = new Blob([JSON.stringify(draft.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${draft.title.replace(/\s+/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const res = await fetch(`/api/cv-builder/${draft.id}/export/pdf`, { method: "POST" });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${draft.title.replace(/\s+/g, "-")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = async () => {
    if (!draft?.id) return;
    const url = `${window.location.origin}/cv/${draft.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
        Export Resume
      </label>

      <div className="flex flex-col gap-2.5">
        {FORMATS.map((fmt) => (
          <div
            key={fmt.id}
            className="flex items-center gap-3 rounded-xl border border-border p-3 bg-background"
          >
            <div className="w-9 h-9 rounded-lg bg-seeker/10 flex items-center justify-center shrink-0">
              <fmt.icon className="h-4.5 w-4.5 text-seeker" />
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
              {fmt.cta}
            </Button>
          </div>
        ))}
      </div>

      {/* Quick share link */}
      <div className="mt-2 rounded-xl border border-border p-3 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick Share Link</p>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-md border border-border bg-background px-2.5 flex items-center overflow-hidden">
            <span className="text-xs text-muted-foreground truncate">
              {draft?.id ? `${typeof window !== "undefined" ? window.location.origin : ""}/cv/${draft.id}` : "Save draft first..."}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={!draft?.id}
            className="h-8 w-8 p-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
