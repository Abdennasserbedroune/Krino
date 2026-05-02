"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { SectionKey } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, GripVertical, Sparkles, FileText } from "lucide-react";

// Section form imports
import { BasicsSection } from "./sections/basics";
import { SummarySection } from "./sections/summary";
import { ExperienceSection } from "./sections/experience";
import { EducationSection } from "./sections/education";
import { SkillsSection } from "./sections/skills";
import { ProjectsSection } from "./sections/projects";
import { CertificationsSection } from "./sections/certifications";
import { LanguagesSection } from "./sections/languages";
import { VolunteerSection } from "./sections/volunteer";
import { AwardsSection } from "./sections/awards";
import { PublicationsSection } from "./sections/publications";
import { ReferencesSection } from "./sections/references";
import { CustomSection } from "./sections/custom";

const SECTION_COMPONENTS: Record<SectionKey, React.ComponentType> = {
  basics: BasicsSection,
  summary: SummarySection,
  experience: ExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  projects: ProjectsSection,
  certifications: CertificationsSection,
  languages: LanguagesSection,
  volunteer: VolunteerSection,
  awards: AwardsSection,
  publications: PublicationsSection,
  references: ReferencesSection,
  custom: CustomSection,
};

function SectionNav() {
  const sectionOrder = useCvBuilderStore((s) => s.draft?.sectionOrder ?? []);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const setActiveSection = useCvBuilderStore((s) => s.setActiveSection);
  const toggleSectionVisibility = useCvBuilderStore((s) => s.toggleSectionVisibility);
  const moveSectionUp = useCvBuilderStore((s) => s.moveSectionUp);
  const moveSectionDown = useCvBuilderStore((s) => s.moveSectionDown);

  const sorted = [...sectionOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col py-2">
      {sorted.map((section, idx) => (
        <div
          key={section.key}
          className={cn(
            "group flex items-center gap-1 px-3 py-1.5 cursor-pointer transition-colors text-sm",
            activeSection === section.key
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
            !section.visible && "opacity-40"
          )}
          onClick={() => setActiveSection(section.key as SectionKey)}
        >
          {/* Drag handle */}
          <GripVertical className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 shrink-0" />

          {/* Section name */}
          <span className="flex-1 truncate">{section.label}</span>

          {/* Reorder arrows - only on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex flex-col -my-1">
            <button
              onClick={(e) => { e.stopPropagation(); moveSectionUp(section.key as SectionKey); }}
              disabled={idx === 0}
              className="disabled:opacity-20 text-muted-foreground hover:text-foreground leading-none"
              aria-label="Move up"
            >
              ▲
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSectionDown(section.key as SectionKey); }}
              disabled={idx === sorted.length - 1}
              className="disabled:opacity-20 text-muted-foreground hover:text-foreground leading-none"
              aria-label="Move down"
            >
              ▼
            </button>
          </div>

          {/* Visibility toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.key as SectionKey); }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={section.visible ? "Hide section" : "Show section"}
          >
            {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      ))}
    </div>
  );
}

function ActiveSectionForm() {
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const Component = SECTION_COMPONENTS[activeSection];
  if (!Component) return null;
  return <Component />;
}

export function SidebarLeft() {
  const leftTab = useCvBuilderStore((s) => s.leftTab);
  const setLeftTab = useCvBuilderStore((s) => s.setLeftTab);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Tab switcher */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "content" | "ai")}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="content" className="flex-1 text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Content
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI Tools
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leftTab === "content" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Section navigation */}
          <ScrollArea className="h-40 shrink-0 border-b border-border">
            <SectionNav />
          </ScrollArea>

          {/* Active section form */}
          <ScrollArea className="flex-1">
            <ActiveSectionForm />
          </ScrollArea>
        </div>
      )}

      {leftTab === "ai" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">AI Tools</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon — rewrite, JD match, cover letter</p>
          </div>
        </div>
      )}
    </div>
  );
}
