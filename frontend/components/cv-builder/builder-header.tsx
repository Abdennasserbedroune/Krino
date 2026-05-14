"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PanelLeft,
  PanelRight,
  Download,
  Share2,
  Check,
  Loader2,
  ChevronLeft,
  Pencil,
  Save,
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

  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Manual save handler — PATCH /api/cv-builder/drafts/:id
  const handleSave = useCallback(async () => {
    if (!draft?.id || isSaving) return;
    setIsSaving(true);
    try {
      await fetch(`/api/cv-builder/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          data: draft.data,
          design: draft.design,
          section_order: draft.sectionOrder,
        }),
      });
      markSaved();
    } catch (err) {
      console.error("[save] failed:", err);
      setIsSaving(false);
    }
  }, [draft, isSaving, markSaved, setIsSaving]);

  // Ctrl+S / Cmd+S — trigger manual save
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave]);

  const openRight = (tab: Parameters<typeof setRightTab>[0]) => {
    setRightTab(tab);
    if (!panelLayout.rightOpen) toggleRight();
  };

  return (
    <header className="flex items-center h-12 px-3 border-b border-border bg-card shrink-0 gap-1.5">

      {/* ── Left cluster: back + left-panel toggle ─────────────────── */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Back to resumes"
        >
          <Link href="/dashboard/cv-builder">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Left panel toggle with clear on/off state */}
        <button
          onClick={toggleLeft}
          title={panelLayout.leftOpen ? "Hide content panel" : "Show content panel"}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-all border",
            panelLayout.leftOpen
              ? "bg-foreground/5 border-border text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted"
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* ── Centre: title + save status ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2">
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
            className="text-sm font-semibold bg-transparent border-b border-primary focus:outline-none text-center min-w-0 max-w-[220px]"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="group flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[220px]"
          >
            <span className="truncate">{draft?.title || "Untitled Resume"}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity" />
          </button>
        )}

        {/* Save status pill */}
        {(isSaving || isDirty || lastSaved) && (
          <span
            className={cn(
              "text-[11px] font-medium shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full",
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
              "● Unsaved"
            ) : (
              <><Check className="h-3 w-3" /> Saved</>
            )}
          </span>
        )}
      </div>

      {/* ── Right cluster: actions + right-panel toggle ────────────── */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Manual Save button — primary action, only shown when dirty */}
        <Button
          size="sm"
          variant={isDirty ? "default" : "ghost"}
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "h-8 px-2.5 text-xs gap-1.5 transition-all",
            isDirty
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "text-muted-foreground"
          )}
          title="Save (Ctrl+S)"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => openRight("share")}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openRight("export")}
          className="h-8 px-2.5 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Right panel toggle */}
        <button
          onClick={toggleRight}
          title={panelLayout.rightOpen ? "Hide design panel" : "Show design panel"}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center transition-all border",
            panelLayout.rightOpen
              ? "bg-foreground/5 border-border text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted"
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
