"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ClassicTemplate } from "./templates/classic";
import { ModernTemplate }  from "./templates/modern";
import { MinimalTemplate } from "./templates/minimal";
import type { CvDraft } from "@/lib/cv-builder/types";

const TEMPLATES = {
  classic: ClassicTemplate,
  modern:  ModernTemplate,
  minimal: MinimalTemplate,
} as const;

export function Artboard() {
  const draft  = useCvBuilderStore((s) => s.draft);
  const zoom   = useCvBuilderStore((s) => s.zoom);
  const setZoom = useCvBuilderStore((s) => s.setZoom);

  if (!draft) return null;

  const TemplateComponent = TEMPLATES[draft.design.template];

  // A4 dimensions in px at 96dpi: 794 × 1123
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const scale  = zoom / 100;

  return (
    <div className="flex flex-col h-full bg-[#e8e8e8] dark:bg-[#1a1a1a]">
      {/* Zoom toolbar */}
      <div className="flex items-center justify-center gap-2 py-2 border-b border-border bg-background/60 backdrop-blur-sm">
        <button
          onClick={() => setZoom(zoom - 10)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="min-w-[52px] h-7 rounded-md border border-border flex items-center justify-center text-xs tabular-nums font-medium text-foreground hover:bg-muted transition-colors"
        >
          {zoom}%
        </button>
        <button
          onClick={() => setZoom(zoom + 10)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(80)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Fit"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-auto">
        <div
          className="flex items-start justify-center"
          style={{ padding: `${Math.max(24, 40 * scale)}px ${24 * scale}px` }}
        >
          <div
            className="origin-top"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: PAGE_W,
              height: PAGE_H,
              marginBottom: `${PAGE_H * scale - PAGE_H}px`,
            }}
          >
            <div
              className="bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)] overflow-hidden"
              style={{ width: PAGE_W, height: PAGE_H }}
            >
              <TemplateComponent draft={draft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
