"use client";

import { useEffect, useRef, useCallback } from "react";
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
const ZOOM_MIN = 30;
const ZOOM_MAX = 200;

/** Clamp helper — keeps every setZoom call within [ZOOM_MIN, ZOOM_MAX] */
const clampZoom = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v)));

export function Artboard() {
  const draft   = useCvBuilderStore((s) => s.draft);
  const zoom    = useCvBuilderStore((s) => s.zoom);
  const setZoom = useCvBuilderStore((s) => s.setZoom);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fitToScreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const scale = Math.min((width - 48) / PAGE_W, (height - 48) / PAGE_H);
    setZoom(clampZoom(Math.min(scale, 1) * 100));
  }, [setZoom]);

  // Auto-fit on mount + container resize
  useEffect(() => {
    fitToScreen();
    const ro = new ResizeObserver(fitToScreen);
    const el = wrapRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+wheel zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoom(clampZoom(zoom + delta));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom, setZoom]);

  // Ctrl+0 = fit to screen, Ctrl+= / Ctrl+- zoom
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "0") { e.preventDefault(); fitToScreen(); }
      if (e.key === "=" || e.key === "+") { e.preventDefault(); setZoom(clampZoom(zoom + 10)); }
      if (e.key === "-") { e.preventDefault(); setZoom(clampZoom(zoom - 10)); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoom, setZoom, fitToScreen]);

  if (!draft) return null;

  const TemplateComponent =
    TEMPLATES[draft.design.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const scale = zoom / 100;

  return (
    <div className="flex flex-col h-full bg-[#e8e8e8] dark:bg-[#171717]">

      {/* ── Zoom bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setZoom(clampZoom(zoom - 10))}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Zoom out (Ctrl+−)"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>

        {/* Zoom level — click to reset to 100% */}
        <button
          onClick={() => setZoom(100)}
          className="min-w-[52px] h-7 rounded-md border border-border flex items-center justify-center text-xs tabular-nums font-medium hover:bg-muted transition-colors"
          title="Reset to 100%"
          aria-label="Reset zoom to 100%"
        >
          {zoom}%
        </button>

        <button
          onClick={() => setZoom(clampZoom(zoom + 10))}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Zoom in (Ctrl++)"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={fitToScreen}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Fit to screen (Ctrl+0)"
          aria-label="Fit to screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <span className="text-[10px] text-muted-foreground/50 ml-1 hidden sm:inline select-none">
          {ZOOM_MIN}–{ZOOM_MAX}%
        </span>
      </div>

      {/* ── Canvas — outer scroll container ───────────────────────── */}
      <div ref={wrapRef} className="flex-1 overflow-auto">
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
              className="bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)]"
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
