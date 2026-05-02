"use client";

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
} from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";

export function BuilderHeader() {
  const draft     = useCvBuilderStore((s) => s.draft);
  const isDirty   = useCvBuilderStore((s) => s.isDirty);
  const isSaving  = useCvBuilderStore((s) => s.isSaving);
  const lastSaved = useCvBuilderStore((s) => s.lastSaved);
  const setTitle  = useCvBuilderStore((s) => s.setTitle);
  const toggleLeft  = useCvBuilderStore((s) => s.toggleLeft);
  const toggleRight = useCvBuilderStore((s) => s.toggleRight);
  const panelLayout = useCvBuilderStore((s) => s.panelLayout);
  const setRightTab = useCvBuilderStore((s) => s.setRightTab);

  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const saveLabel = isSaving
    ? null
    : isDirty
    ? "Unsaved"
    : lastSaved
    ? "Saved"
    : null;

  return (
    <header className="flex items-center h-12 px-3 border-b border-border bg-card shrink-0 gap-2">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 shrink-0">
        <Link href="/dashboard/cv-builder">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      {/* Toggle left panel */}
      <button
        onClick={toggleLeft}
        className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
          panelLayout.leftOpen
            ? "bg-seeker/10 text-seeker"
            : "text-muted-foreground hover:bg-muted"
        )}
        title={panelLayout.leftOpen ? "Hide content panel" : "Show content panel"}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Title */}
      <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
        {editingTitle ? (
          <input
            ref={titleRef}
            autoFocus
            value={draft?.title ?? ""}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false); }}
            className="text-sm font-semibold bg-transparent border-b border-seeker focus:outline-none text-center min-w-0 max-w-[200px]"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="group flex items-center gap-1 text-sm font-semibold text-foreground hover:text-seeker transition-colors truncate"
          >
            <span className="truncate">{draft?.title || "Untitled Resume"}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
          </button>
        )}

        {/* Save status */}
        {(isSaving || saveLabel) && (
          <span
            className={cn(
              "text-[10px] font-medium shrink-0 flex items-center gap-1",
              isSaving ? "text-muted-foreground" : isDirty ? "text-amber-500" : "text-green-500"
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

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setRightTab("share"); if (!panelLayout.rightOpen) toggleRight(); }}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRightTab("export"); if (!panelLayout.rightOpen) toggleRight(); }}
          className="h-8 px-2.5 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* Toggle right panel */}
      <button
        onClick={toggleRight}
        className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
          panelLayout.rightOpen
            ? "bg-seeker/10 text-seeker"
            : "text-muted-foreground hover:bg-muted"
        )}
        title={panelLayout.rightOpen ? "Hide design panel" : "Show design panel"}
      >
        <PanelRight className="h-4 w-4" />
      </button>
    </header>
  );
}
