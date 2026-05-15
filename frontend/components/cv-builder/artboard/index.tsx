"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
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

const PAGE_W  = 794;
const PAGE_H  = 1123;

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
    setZoom(Math.round(Math.min(scale, 1) * 100));
  }, [setZoom]);

  useEffect(() => {
    fitToScreen();
    const ro = new ResizeObserver(fitToScreen);
    const el = wrapRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(zoom + (e.deltaY > 0 ? -5 : 5));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom, setZoom]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "0") { e.preventDefault(); fitToScreen(); }
      if (e.key === "=" || e.key === "+") { e.preventDefault(); setZoom(zoom + 10); }
      if (e.key === "-") { e.preventDefault(); setZoom(zoom - 10); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoom, setZoom, fitToScreen]);

  if (!draft) return null;

  const TemplateComponent = TEMPLATES[draft.design.template as keyof typeof TEMPLATES] ?? ClassicTemplate;
  const scale = zoom / 100;

  return (
    // No zoom bar here — zoom controls live in the header
    <div ref={wrapRef} className="flex-1 h-full overflow-auto flex items-start justify-center p-6 bg-[#e8e8e8] dark:bg-[#171717]">
      {/* data-artboard: queried by PDF export */}
      <div
        data-artboard
        style={{
          width:  PAGE_W,
          height: PAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          flexShrink: 0,
          background: "#fff",
          boxShadow: "0 4px 32px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)",
          borderRadius: 2,
        }}
      >
        <TemplateComponent draft={draft} />
      </div>
    </div>
  );
}
