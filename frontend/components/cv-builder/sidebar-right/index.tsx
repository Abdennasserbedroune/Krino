"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { RightTab } from "@/lib/cv-builder/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Type,
  FileText,
  LayoutTemplate,
  Zap,
  Download,
  Share2,
} from "lucide-react";

import { DesignSection }     from "./sections/design";
import { TypographySection } from "./sections/typography";
import { PageSection }       from "./sections/page";
import { TemplateSection }   from "./sections/template";
import { AtsScoreSection }   from "./sections/ats-score";
import { ExportSection }     from "./sections/export";
import { ShareSection }      from "./sections/share";

// 5 core tabs in the rail (Export + Share are header shortcuts that also open these)
const RAIL_TABS: { id: RightTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "design",     icon: Palette,        label: "Design"    },
  { id: "typography", icon: Type,           label: "Type"      },
  { id: "page",       icon: FileText,       label: "Page"      },
  { id: "template",   icon: LayoutTemplate, label: "Template"  },
  { id: "ats",        icon: Zap,            label: "ATS"       },
];

// Export and Share are reachable via header buttons — also shown as ghost tabs when active
const EXTRA_TABS: { id: RightTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "export", icon: Download, label: "Export" },
  { id: "share",  icon: Share2,   label: "Share"  },
];

const TAB_CONTENT: Record<RightTab, React.ComponentType> = {
  design:     DesignSection,
  typography: TypographySection,
  page:       PageSection,
  template:   TemplateSection,
  ats:        AtsScoreSection,
  export:     ExportSection,
  share:      ShareSection,
};

export function SidebarRight() {
  const rightTab    = useCvBuilderStore((s) => s.rightTab);
  const setRightTab = useCvBuilderStore((s) => s.setRightTab);

  const ActiveSection = TAB_CONTENT[rightTab];

  // Show extra tab in rail only when it is the active tab
  const activeIsExtra = EXTRA_TABS.some(t => t.id === rightTab);
  const visibleExtra  = activeIsExtra ? EXTRA_TABS.filter(t => t.id === rightTab) : [];
  const allVisible    = [...RAIL_TABS, ...visibleExtra];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab rail — 5 fixed tabs, auto-width per tab */}
      <nav className="flex border-b border-border shrink-0">
        {allVisible.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            title={tab.label}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-0 py-2.5 text-xs font-medium transition-colors flex-1 border-b-2 min-w-0",
              rightTab === tab.id
                ? "border-[#111827] text-[#111827] bg-[#111827]/5 dark:border-white dark:text-white dark:bg-white/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-[10px] leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <ScrollArea className="flex-1">
        <ActiveSection />
      </ScrollArea>
    </div>
  );
}
