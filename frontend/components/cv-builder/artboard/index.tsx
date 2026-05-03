"use client";

import { useEffect, useRef } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ClassicTemplate }   from "./templates/classic";
import { ModernTemplate }    from "./templates/modern";
import { MinimalTemplate }   from "./templates/minimal";
import { ExecutiveTemplate } from "./templates/executive";
import { SidebarTemplate }   from "./templates/sidebar";
import { CreativeTemplate }  from "./templates/creative";

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
  const draft   = useCvBuilderStore((s) => s.draft);
  const zoom    = useCvBuilderStore((s) => s.zoom);
  const setZoom = useCvBuilderStore((s) => s.setZoom);
  const wrapRef  = useRef<HTMLDivElement>(null);

  // Auto-fit on mount + container resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min((width - 48) / PAGE_W, (height - 48) / PAGE_H);
      setZoom(Math.round(Math.min(scale, 1) * 100));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return null;

  const TemplateComponent = TEMPLATES[draft.design.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const scale = zoom / 100;

  return (
    <div className="flex flex-col h-full bg-[#e4e4e4] dark:bg-[#1a1a1a]">
      {/* Zoom bar */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 border-b border-border bg-background/90 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setZoom(zoom - 5)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="min-w-[52px] h-7 rounded-md border border-border flex items-center justify-center text-xs tabular-nums font-medium hover:bg-muted transition-colors"
        >
          {zoom}%
        </button>
        <button
          onClick={() => setZoom(zoom + 5)}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={() => {
            const el = wrapRef.current;
            if (!el) return;
            const { width, height } = el.getBoundingClientRect();
            const scale = Math.min((width - 48) / PAGE_W, (height - 48) / PAGE_H);
            setZoom(Math.round(Math.min(scale, 1) * 100));
          }}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Fit to screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas — outer scroll container */}
      <div ref={wrapRef} className="flex-1 overflow-auto">
        {/*
          Inner div is exactly scaled-page sized so the scroll container
          knows exactly how big the content is. No JS margin compensation needed.
        */}
        <div
          style={{
            width:  PAGE_W * scale,
            height: PAGE_H * scale,
            margin: "24px auto",
          }}
        >
          {/* The actual A4 page, scaled from top-left */}
          <div
            style={{
              width:           PAGE_W,
              height:          PAGE_H,
              transform:       `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="bg-white shadow-[0_2px_24px_rgba(0,0,0,0.16)]"
              style={{ width: PAGE_W, height: PAGE_H, overflow: "hidden" }}
            >
              <TemplateComponent draft={draft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
