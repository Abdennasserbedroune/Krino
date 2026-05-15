"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { SectionKey } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, EyeOff, GripVertical, Sparkles, FileText,
  ChevronUp, ChevronDown, Loader2, Check,
} from "lucide-react";

import { BasicsSection }         from "./sections/basics";
import { SummarySection }        from "./sections/summary";
import { ExperienceSection }     from "./sections/experience";
import { EducationSection }      from "./sections/education";
import { SkillsSection }         from "./sections/skills";
import { ProjectsSection }       from "./sections/projects";
import { CertificationsSection } from "./sections/certifications";
import { LanguagesSection }      from "./sections/languages";
import { VolunteerSection }      from "./sections/volunteer";
import { AwardsSection }         from "./sections/awards";
import { PublicationsSection }   from "./sections/publications";
import { ReferencesSection }     from "./sections/references";
import { CustomSection }         from "./sections/custom";

const SECTION_COMPONENTS: Record<SectionKey, React.ComponentType> = {
  basics:         BasicsSection,
  summary:        SummarySection,
  experience:     ExperienceSection,
  education:      EducationSection,
  skills:         SkillsSection,
  projects:       ProjectsSection,
  certifications: CertificationsSection,
  languages:      LanguagesSection,
  volunteer:      VolunteerSection,
  awards:         AwardsSection,
  publications:   PublicationsSection,
  references:     ReferencesSection,
  custom:         CustomSection,
};

// ─── Section nav ──────────────────────────────────────────────────────────────
function SectionNav() {
  const sectionOrder           = useCvBuilderStore((s) => s.draft?.sectionOrder ?? []);
  const activeSection          = useCvBuilderStore((s) => s.activeSection);
  const setActiveSection       = useCvBuilderStore((s) => s.setActiveSection);
  const toggleSectionVisibility = useCvBuilderStore((s) => s.toggleSectionVisibility);
  const moveSectionUp          = useCvBuilderStore((s) => s.moveSectionUp);
  const moveSectionDown        = useCvBuilderStore((s) => s.moveSectionDown);

  const sorted = [...sectionOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col py-1">
      {sorted.map((section, idx) => {
        const isActive = activeSection === section.key;
        return (
          <div
            key={section.key}
            className={cn(
              "group flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors text-sm select-none",
              isActive
                ? "bg-[#111827] text-white rounded-md mx-1"
                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
              !section.visible && "opacity-40"
            )}
            onClick={() => setActiveSection(section.key as SectionKey)}
          >
            {/* Drag handle */}
            <GripVertical className={cn("h-3.5 w-3.5 shrink-0", isActive ? "opacity-40" : "opacity-0 group-hover:opacity-30")} />

            {/* Section name */}
            <span className="flex-1 truncate text-xs font-medium">{section.label}</span>

            {/* Controls — visible on hover OR when active */}
            <div className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <button
                onClick={(e) => { e.stopPropagation(); moveSectionUp(section.key as SectionKey); }}
                disabled={idx === 0}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive
                    ? "text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20"
                )}
                aria-label="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); moveSectionDown(section.key as SectionKey); }}
                disabled={idx === sorted.length - 1}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive
                    ? "text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20"
                )}
                aria-label="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.key as SectionKey); }}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-label={section.visible ? "Hide section" : "Show section"}
              >
                {section.visible
                  ? <Eye className="h-3 w-3" />
                  : <EyeOff className="h-3 w-3" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Active section form ──────────────────────────────────────────────────────
function ActiveSectionForm() {
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const Component = SECTION_COMPONENTS[activeSection];
  if (!Component) return null;
  return <Component />;
}

// ─── AI Tools tab ─────────────────────────────────────────────────────────────
type AiAction = "improve" | "shorten" | "expand" | "tailor";

function AiToolsTab() {
  const draft = useCvBuilderStore((s) => s.draft);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const [field, setField]     = useState("");
  const [current, setCurrent] = useState("");
  const [action, setAction]   = useState<AiAction>("improve");
  const [jd, setJd]           = useState("");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [applied, setApplied]   = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!draft?.id || !current.trim()) return;
    setLoading(true);
    setError(null);
    setVariants([]);
    setApplied(null);
    try {
      const res = await fetch("/api/cv-builder/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          section: activeSection,
          field: field || activeSection,
          currentValue: current,
          action,
          jdText: jd || undefined,
        }),
      });
      if (!res.ok) throw new Error(`AI suggest failed (${res.status})`);
      const data = await res.json();
      setVariants(data.variants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const ACTIONS: { id: AiAction; label: string }[] = [
    { id: "improve",  label: "Improve"  },
    { id: "shorten",  label: "Shorten"  },
    { id: "expand",   label: "Expand"   },
    { id: "tailor",   label: "JD Tailor" },
  ];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-[#111827]" />
        <p className="text-xs font-semibold">AI Writing Assistant</p>
      </div>

      {/* Action selector */}
      <div className="flex gap-1 flex-wrap">
        {ACTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => setAction(a.id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              action === a.id
                ? "bg-[#111827] text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Current text */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Current text
        </label>
        <textarea
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="Paste the text you want to improve…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#111827]"
          rows={4}
        />
      </div>

      {/* Optional JD for tailor mode */}
      {action === "tailor" && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Job description
          </label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#111827]"
            rows={4}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSuggest}
        disabled={loading || !current.trim()}
        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[#111827] text-white text-xs font-medium hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? "Generating…" : "Get Suggestions"}
      </button>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Suggestions</p>
          {variants.map((v, i) => (
            <div
              key={i}
              className={cn(
                "relative rounded-lg border p-3 text-xs leading-relaxed cursor-pointer transition-all group",
                applied === i
                  ? "border-green-500 bg-green-500/5"
                  : "border-border hover:border-[#111827]/40 hover:bg-muted/30"
              )}
              onClick={() => {
                // Copy to clipboard so user can paste into the field they want
                navigator.clipboard.writeText(v).catch(() => {});
                setApplied(i);
              }}
            >
              <span className="absolute top-2 right-2">
                {applied === i
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">Copy</span>
                }
              </span>
              {v}
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Click a suggestion to copy it, then paste into the field.</p>
        </div>
      )}
    </div>
  );
}

// ─── SidebarLeft ─────────────────────────────────────────────────────────────
export function SidebarLeft() {
  const leftTab    = useCvBuilderStore((s) => s.leftTab);
  const setLeftTab = useCvBuilderStore((s) => s.setLeftTab);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab switcher */}
      <div className="border-b border-border px-2 py-2 shrink-0">
        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "content" | "ai")}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="content" className="flex-1 text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />
              Content
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI Tools
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leftTab === "content" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Section nav — flex-none with its own scroll, takes only what it needs up to ~40% */}
          <div className="shrink-0 max-h-[45%] overflow-y-auto border-b border-border">
            <SectionNav />
          </div>

          {/* Active section form — takes remaining space */}
          <ScrollArea className="flex-1">
            <ActiveSectionForm />
          </ScrollArea>
        </div>
      )}

      {leftTab === "ai" && (
        <ScrollArea className="flex-1">
          <AiToolsTab />
        </ScrollArea>
      )}
    </div>
  );
}
