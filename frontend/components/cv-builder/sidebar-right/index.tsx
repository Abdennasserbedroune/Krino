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
  Download,
  Share2,
  Zap,
} from "lucide-react";

import { DesignSection }     from "./sections/design";
import { TypographySection } from "./sections/typography";
import { PageSection }       from "./sections/page";
import { TemplateSection }   from "./sections/template";
import { ExportSection }     from "./sections/export";
import { ShareSection }      from "./sections/share";
import { AtsScoreSection }   from "./sections/ats-score";

const TABS: { id: RightTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "design",     icon: Palette,        label: "Design"     },
  { id: "typography", icon: Type,           label: "Type"       },
  { id: "page",       icon: FileText,       label: "Page"       },
  { id: "template",   icon: LayoutTemplate, label: "Template"   },
  { id: "ats",        icon: Zap,            label: "ATS"        },
  { id: "export",     icon: Download,       label: "Export"     },
  { id: "share",      icon: Share2,         label: "Share"      },
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
  const rightTab = useCvBuilderStore((s) => s.rightTab);
  const setRightTab = useCvBuilderStore((s) => s.setRightTab);

  const ActiveSection = TAB_CONTENT[rightTab];

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Icon tab rail */}
      <nav className="flex border-b border-border shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            title={tab.label}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-[10px] font-medium transition-colors shrink-0 border-b-2",
              rightTab === tab.id
                ? "border-seeker text-seeker bg-seeker/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        <ActiveSection />
      </ScrollArea>
    </div>
  );
}
