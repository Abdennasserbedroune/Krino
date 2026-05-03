"use client";

import { useEffect, useRef } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ClassicTemplate }   from "./templates/classic";
import { ModernTemplate }    from "./templates/modern";
import { MinimalTemplate }   from "./templates/minimal";
import { ExecutiveTemplate } from "./templates/executive";
import { SidebarTemplate }   from "./templates/sidebar";
import { CreativeTemplate }  from "./templates/creative";
import type { CvDraft } from "@/lib/cv-builder/types";

const TEMPLATES = {
  classic:   ClassicTemplate,
  modern:    ModernTemplate,
  minimal:   MinimalTemplate,
  executive: ExecutiveTemplate,
  sidebar:   SidebarTemplate,
  creative:  CreativeTemplate,
} as const;

// A4 at 96 dpi
const PAGE_W = 794;
const PAGE_H = 1123;

export function Artboard() {
  const draft    = useCvBuilderStore((s) => s.draft);
  const zoom     = useCvBuilderStore((s) => s.zoom);
  const setZoom  = useCvBuilderStore((s) => s.setZoom);
  const containerRef = useRef<HTMLDivElement>(null);

  // On first mount auto-fit the page into the available canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const fit = () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      const padH = 48; // top + bottom padding
      const padW = 48;
      const fitScale = Math.min(
        (width  - padW)  / PAGE_W,
        (height - padH)  / PAGE_H
      );
      setZoom(Math.round(fitScale * 100));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return null;

  const TemplateComponent = TEMPLATES[draft.design.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const scale = zoom / 100;
  const scaledH = PAGE_H * scale;

  return (
    <div className="flex flex-col h-full bg-[#e8e8e8] dark:bg-[#1a1a1a]">
      {/* Zoom toolbar */}
      <div className="flex items-center justify-center gap-2 py-1.5 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setZoom(zoom - 5)}
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
          onClick={() => setZoom(zoom + 5)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            if (!containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();
            const fitScale = Math.min((width - 48) / PAGE_W, (height - 48) / PAGE_H);
            setZoom(Math.round(fitScale * 100));
          }}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Fit to screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas — scrollable only when zoomed in above fit */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <div
          className="flex items-start justify-center"
          style={{
            minHeight: "100%",
            padding: `24px`,
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: PAGE_W,
              height: PAGE_H,
              // Compensate so the outer div shrinks/grows with scale
              marginBottom: scaledH - PAGE_H,
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
