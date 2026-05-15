"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import {
  PanelLeft,
  PanelRight,
  Download,
  Check,
  Loader2,
  ChevronLeft,
  Pencil,
  Save,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";

export function BuilderHeader() {
  const draft       = useCvBuilderStore((s) => s.draft);
  const isDirty     = useCvBuilderStore((s) => s.isDirty);
  const isSaving    = useCvBuilderStore((s) => s.isSaving);
  const lastSaved   = useCvBuilderStore((s) => s.lastSaved);
  const setTitle    = useCvBuilderStore((s) => s.setTitle);
  const toggleLeft  = useCvBuilderStore((s) => s.toggleLeft);
  const toggleRight = useCvBuilderStore((s) => s.toggleRight);
  const panelLayout = useCvBuilderStore((s) => s.panelLayout);
  const setRightTab = useCvBuilderStore((s) => s.setRightTab);
  const markSaved   = useCvBuilderStore((s) => s.markSaved);
  const setIsSaving = useCvBuilderStore((s) => s.setIsSaving);
  const zoom        = useCvBuilderStore((s) => s.zoom);
  const setZoom     = useCvBuilderStore((s) => s.setZoom);

  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    if (!draft?.id || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cv-builder/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          data: draft.data,
          design: draft.design,
          section_order: draft.sectionOrder,
        }),
      });
      if (res.ok) markSaved();
      else setIsSaving(false);
    } catch {
      setIsSaving(false);
    }
  }, [draft, isSaving, markSaved, setIsSaving]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const openRight = (tab: Parameters<typeof setRightTab>[0]) => {
    setRightTab(tab);
    if (!panelLayout.rightOpen) toggleRight();
  };

  return (
    <header
      className="flex items-center h-11 px-3 border-b border-border bg-card shrink-0"
      style={{ gap: 6 }}
    >
      {/* LEFT — back + panel toggle */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/dashboard/cv-builder"
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Back to resumes"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <button
          onClick={toggleLeft}
          title={panelLayout.leftOpen ? "Hide content panel" : "Show content panel"}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-all",
            panelLayout.leftOpen
              ? "bg-[#111827]/8 text-[#111827] dark:bg-white/10 dark:text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* CENTRE — title + unsaved badge + zoom controls (all inline, no separate zoom bar) */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2">
        {/* Editable title */}
        {editingTitle ? (
          <input
            ref={titleRef}
            autoFocus
            value={draft?.title ?? ""}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
            }}
            className="text-sm font-semibold bg-transparent border-b border-[#111827] focus:outline-none text-center min-w-0 max-w-[180px]"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="group flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-[#111827] transition-colors truncate max-w-[180px]"
          >
            <span className="truncate">{draft?.title || "Untitled Resume"}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" />
          </button>
        )}

        {/* Save status pill */}
        {(isSaving || isDirty || lastSaved) && (
          <span
            className={cn(
              "text-[11px] font-medium shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap",
              isSaving
                ? "bg-muted text-muted-foreground"
                : isDirty
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            )}
          >
            {isSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
            ) : isDirty ? (
              "\u25CF Unsaved"
            ) : (
              <><Check className="h-3 w-3" /> Saved</>
            )}
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1 shrink-0" />

        {/* Zoom controls — inline with the title row, no separate bar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom(zoom - 10)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="min-w-[44px] h-6 rounded text-xs tabular-nums font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors px-1"
            title="Reset to 100%"
          >
            {zoom}%
          </button>
          <button
            onClick={() => setZoom(zoom + 10)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* RIGHT — Save + Export + right panel toggle (Share removed) */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          title="Save (Ctrl+S)"
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all",
            isDirty && !isSaving
              ? "bg-[#111827] text-white hover:bg-[#1f2937]"
              : "text-muted-foreground cursor-default opacity-50"
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>

        {/* Export shortcut */}
        <button
          onClick={() => openRight("export")}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs border border-border text-foreground hover:bg-muted transition-colors"
          title="Export resume"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Right panel toggle */}
        <button
          onClick={toggleRight}
          title={panelLayout.rightOpen ? "Hide design panel" : "Show design panel"}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-all",
            panelLayout.rightOpen
              ? "bg-[#111827]/8 text-[#111827] dark:bg-white/10 dark:text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
