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

  useEffect(() => {
    initialize(draft);
    return () => initialize(null);
  }, [draft, initialize]);

  return (
    // z-index 100 so it sits above the dashboard sidebar (z-index 50)
    // fixed inset-0 so it truly owns the viewport
    <div
      className="fixed inset-0 flex flex-col bg-background"
      style={{ zIndex: 100 }}
    >
      <BuilderHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div
          className={cn(
            "transition-all duration-200 shrink-0 overflow-hidden",
            panelLayout.leftOpen ? "w-[300px] border-r border-border" : "w-0"
          )}
        >
          <div className="w-[300px] h-full">
            <SidebarLeft />
          </div>
        </div>

        {/* Artboard */}
        <div className="flex-1 overflow-hidden min-w-0">
          <Artboard />
        </div>

        {/* Right sidebar */}
        <div
          className={cn(
            "transition-all duration-200 shrink-0 overflow-hidden",
            panelLayout.rightOpen ? "w-[260px] border-l border-border" : "w-0"
          )}
        >
          <div className="w-[260px] h-full">
            <SidebarRight />
          </div>
        </div>
      </div>
    </div>
  );
}
