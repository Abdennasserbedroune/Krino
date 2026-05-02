"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { TemplateId } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const TEMPLATES: {
  id: TemplateId;
  label: string;
  description: string;
  preview: React.FC<{ accent: string; primary: string }>;
}[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Clean, traditional — safe for any ATS",
    preview: ({ accent, primary }) => (
      <div className="w-full h-full flex flex-col gap-1 p-2" style={{ fontFamily: "Inter" }}>
        <div className="h-2 w-3/4 rounded-sm" style={{ backgroundColor: primary, opacity: 0.9 }} />
        <div className="h-1 w-1/2 rounded-sm bg-muted-foreground/30" />
        <div className="mt-1 h-px" style={{ backgroundColor: accent }} />
        {["80%", "60%", "70%", "50%"].map((w, i) => (
          <div key={i} className="h-1 rounded-sm bg-muted-foreground/20" style={{ width: w }} />
        ))}
        <div className="mt-1 h-1 w-1/3 rounded-sm" style={{ backgroundColor: accent, opacity: 0.6 }} />
        {["75%", "55%"].map((w, i) => (
          <div key={i} className="h-1 rounded-sm bg-muted-foreground/20" style={{ width: w }} />
        ))}
      </div>
    ),
  },
  {
    id: "modern",
    label: "Modern",
    description: "Two-column, visual hierarchy — stands out",
    preview: ({ accent, primary }) => (
      <div className="w-full h-full flex gap-1.5 p-2">
        {/* Left column */}
        <div className="w-1/3 flex flex-col gap-1 rounded-sm p-1.5" style={{ backgroundColor: primary, opacity: 0.95 }}>
          <div className="h-1.5 w-full rounded-sm bg-white/30" />
          <div className="h-1 w-3/4 rounded-sm bg-white/20" />
          <div className="mt-1 h-px bg-white/20" />
          {["100%", "80%", "90%"].map((w, i) => (
            <div key={i} className="h-1 rounded-sm bg-white/15" style={{ width: w }} />
          ))}
        </div>
        {/* Right column */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1 w-2/3 rounded-sm" style={{ backgroundColor: accent, opacity: 0.7 }} />
          {["90%", "70%", "80%", "60%"].map((w, i) => (
            <div key={i} className="h-1 rounded-sm bg-muted-foreground/20" style={{ width: w }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Ultra-clean whitespace — elite feel",
    preview: ({ accent, primary }) => (
      <div className="w-full h-full flex flex-col gap-1.5 p-2">
        <div className="h-2.5 w-1/2 rounded-sm" style={{ backgroundColor: primary, opacity: 0.8 }} />
        <div className="h-1 w-1/3 rounded-sm bg-muted-foreground/20" />
        <div className="mt-2 flex flex-col gap-1">
          {["90%", "65%", "75%", "50%", "70%"].map((w, i) => (
            <div key={i} className="h-0.5 rounded-full bg-muted-foreground/15" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-1 h-px" style={{ backgroundColor: accent, opacity: 0.4 }} />
        {["80%", "60%"].map((w, i) => (
          <div key={i} className="h-0.5 rounded-full bg-muted-foreground/15" style={{ width: w }} />
        ))}
      </div>
    ),
  },
];

export function TemplateSection() {
  const design = useCvBuilderStore((s) => s.draft?.design);
  const updateDesign = useCvBuilderStore((s) => s.updateDesign);

  if (!design) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
        Resume Template
      </label>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => updateDesign({ template: tpl.id })}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-seeker/60 hover:shadow-sm",
              design.template === tpl.id
                ? "border-seeker bg-seeker/5 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]"
                : "border-border bg-background"
            )}
          >
            {/* Mini preview */}
            <div
              className="shrink-0 w-20 h-28 rounded-md border border-border overflow-hidden bg-paper shadow-sm"
            >
              <tpl.preview accent={design.accentColor} primary={design.primaryColor} />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{tpl.label}</span>
                {design.template === tpl.id && (
                  <CheckCircle className="h-4 w-4 text-seeker" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{tpl.description}</p>
              <div className="mt-2 flex gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: design.primaryColor }}
                />
                <span
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: design.accentColor }}
                />
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: design.fontFamily }}>
                  Aa — {design.fontFamily}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
