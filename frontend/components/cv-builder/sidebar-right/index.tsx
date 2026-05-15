"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { RightTab } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Type, FileText, LayoutTemplate, Zap, Download } from "lucide-react";

import { DesignSection }     from "./sections/design";
import { TypographySection } from "./sections/typography";
import { PageSection }       from "./sections/page";
import { TemplateSection }   from "./sections/template";
import { AtsScoreSection }   from "./sections/ats-score";
import { ExportSection }     from "./sections/export";

// 6 tabs — Export replaces Share
const TABS: { id: RightTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "design",     icon: Palette,        label: "Design"   },
  { id: "typography", icon: Type,           label: "Type"     },
  { id: "page",       icon: FileText,       label: "Page"     },
  { id: "template",   icon: LayoutTemplate, label: "Template" },
  { id: "ats",        icon: Zap,            label: "ATS"      },
  { id: "export",     icon: Download,       label: "Export"   },
];

const TAB_CONTENT: Partial<Record<RightTab, React.ComponentType>> = {
  design:     DesignSection,
  typography: TypographySection,
  page:       PageSection,
  template:   TemplateSection,
  ats:        AtsScoreSection,
  export:     ExportSection,
};

export function SidebarRight() {
  const rightTab    = useCvBuilderStore((s) => s.rightTab);
  const setRightTab = useCvBuilderStore((s) => s.setRightTab);
  const ActiveSection = TAB_CONTENT[rightTab] ?? DesignSection;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab rail */}
      <nav className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            title={tab.label}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors flex-1 border-b-2 min-w-0 px-1",
              rightTab === tab.id
                ? "border-[#111827] text-[#111827] bg-[#111827]/5 dark:border-white dark:text-white dark:bg-white/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="text-[9px] leading-none mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content area */}
      <ScrollArea className="flex-1">
        <ActiveSection />
      </ScrollArea>
    </div>
  );
}
