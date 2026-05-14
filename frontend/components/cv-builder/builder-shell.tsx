"use client";

import { useEffect } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvDraft } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";

import { BuilderHeader } from "./builder-header";
import { SidebarLeft }  from "./sidebar-left";
import { SidebarRight } from "./sidebar-right";
import { Artboard }     from "./artboard";

interface BuilderShellProps {
  draft: CvDraft;
}

export function BuilderShell({ draft }: BuilderShellProps) {
  const initialize  = useCvBuilderStore((s) => s.initialize);
  const panelLayout = useCvBuilderStore((s) => s.panelLayout);

  // Boot the store with the server-fetched draft
  useEffect(() => {
    initialize(draft);
    return () => initialize(null);
  }, [draft, initialize]);

  // NOTE: autosave removed — save is now manual via the Save button in the header

  return (
    // Use fixed positioning so the builder truly fills the viewport
    // regardless of the dashboard layout's padding and topbar.
    <div
      className="fixed inset-0 flex flex-col bg-background"
      style={{ zIndex: 20 }}
    >
      <BuilderHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — content & section nav */}
        <div
          className={cn(
            "transition-all duration-200 shrink-0 overflow-hidden border-r border-border",
            panelLayout.leftOpen ? "w-[320px]" : "w-0"
          )}
        >
          <div className="w-[320px] h-full">
            <SidebarLeft />
          </div>
        </div>

        {/* Artboard — live A4 preview */}
        <div className="flex-1 overflow-hidden">
          <Artboard />
        </div>

        {/* Right sidebar — design, ATS, export */}
        <div
          className={cn(
            "transition-all duration-200 shrink-0 overflow-hidden border-l border-border",
            panelLayout.rightOpen ? "w-[280px]" : "w-0"
          )}
        >
          <div className="w-[280px] h-full">
            <SidebarRight />
          </div>
        </div>
      </div>
    </div>
  );
}
