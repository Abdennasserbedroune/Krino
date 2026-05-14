"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { SectionKey } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  GripVertical,
  Sparkles,
  FileText,
  ChevronUp,
  ChevronDown,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

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

const AI_ACTIONS = ["improve", "tailor", "shorten", "expand"] as const;
type AiAction = typeof AI_ACTIONS[number];

function SectionNav() {
  const sectionOrder             = useCvBuilderStore((s) => s.draft?.sectionOrder ?? []);
  const activeSection            = useCvBuilderStore((s) => s.activeSection);
  const setActiveSection         = useCvBuilderStore((s) => s.setActiveSection);
  const toggleSectionVisibility  = useCvBuilderStore((s) => s.toggleSectionVisibility);
  const moveSectionUp            = useCvBuilderStore((s) => s.moveSectionUp);
  const moveSectionDown          = useCvBuilderStore((s) => s.moveSectionDown);

  const sorted = [...sectionOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col py-1">
      {sorted.map((section, idx) => (
        <div
          key={section.key}
          className={cn(
            "group flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors text-sm rounded-md mx-1",
            activeSection === section.key
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
            !section.visible && "opacity-40"
          )}
          onClick={() => setActiveSection(section.key as SectionKey)}
        >
          {/* Drag handle — always subtle, only grab-cursor affordance */}
          <GripVertical className="h-3.5 w-3.5 opacity-20 shrink-0 cursor-grab" />

          <span className="flex-1 truncate text-xs font-medium">{section.label}</span>

          {/* Reorder + visibility controls — hidden until row is hovered/focused */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <div className="flex flex-col">
              <button
                onClick={(e) => { e.stopPropagation(); moveSectionUp(section.key as SectionKey); }}
                disabled={idx === 0}
                className="h-3.5 w-4 flex items-center justify-center disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Move section up"
                tabIndex={0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); moveSectionDown(section.key as SectionKey); }}
                disabled={idx === sorted.length - 1}
                className="h-3.5 w-4 flex items-center justify-center disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Move section down"
                tabIndex={0}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.key as SectionKey); }}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded"
              aria-label={section.visible ? "Hide section" : "Show section"}
              tabIndex={0}
            >
              {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
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

function AiToolsPanel() {
  const draft         = useCvBuilderStore((s) => s.draft);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  // Generic updater — applies a variant string to the active section's primary text field.
  // Works best for summary/objective; for nested fields users can still copy.
  const updateSection = useCvBuilderStore((s) => s.updateSection);

  const [field,        setField]        = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [jdText,       setJdText]       = useState("");
  const [action,       setAction]       = useState<AiAction>("improve");
  const [variants,     setVariants]     = useState<string[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [copiedIndex,  setCopiedIndex]  = useState<number | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const handleSuggest = async () => {
    if (!draft?.id || !currentValue.trim()) return;
    setLoading(true);
    setError(null);
    setVariants([]);

    try {
      const res = await fetch("/api/cv-builder/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          section: activeSection,
          field: field || "bullets",
          currentValue,
          action,
          jdText: jdText || undefined,
        }),
      });

      if (!res.ok) throw new Error(`Suggest failed (${res.status})`);
      const data = await res.json();
      setVariants(Array.isArray(data?.variants) ? data.variants : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI suggest failed");
    } finally {
      setLoading(false);
    }
  };

  const copyVariant = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1400);
    } catch {}
  };

  const applyVariant = (value: string, index: number) => {
    // Update the active section's primary field in the store.
    // updateSection merges the payload into draft.data[activeSection].
    const targetField = field || "content";
    updateSection(activeSection, { [targetField]: value });
    setCurrentValue(value);
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 1400);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">AI Improve</span>
          <span className="ml-auto text-[11px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded-full">
            {activeSection}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {AI_ACTIONS.map((value) => (
            <button
              key={value}
              onClick={() => setAction(value)}
              className={cn(
                "text-xs py-1.5 rounded-md border capitalize transition-colors font-medium",
                action === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Field name</label>
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="e.g. bullets, summary, achievements"
            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Current text</label>
          <textarea
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="Paste the bullet or sentence to improve…"
            className="w-full text-xs rounded-lg border border-border bg-background p-2 resize-none h-24 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Job description <span className="opacity-50">(optional)</span>
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste job description to tailor the output…"
            className="w-full text-xs rounded-lg border border-border bg-background p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-lg">{error}</p>
        )}

        <Button
          size="sm"
          onClick={handleSuggest}
          disabled={loading || !currentValue.trim()}
          className="h-8 text-xs gap-1.5 w-full"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating…" : `${action.charAt(0).toUpperCase() + action.slice(1)} with AI`}
        </Button>

        {variants.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
            </label>
            {variants.map((variant, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-background overflow-hidden"
              >
                <p className="text-xs leading-relaxed p-2.5">{variant}</p>
                <div className="flex border-t border-border/60">
                  {/* Apply — writes the variant to the store field */}
                  <button
                    onClick={() => applyVariant(variant, index)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors border-r border-border/60",
                      appliedIndex === index
                        ? "text-green-600 dark:text-green-400 bg-green-500/5"
                        : "text-foreground hover:bg-muted/40"
                    )}
                  >
                    {appliedIndex === index ? (
                      <><Check className="h-3 w-3" /> Applied</>
                    ) : (
                      "Apply"
                    )}
                  </button>
                  {/* Copy — clipboard only */}
                  <button
                    onClick={() => copyVariant(variant, index)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors",
                      copiedIndex === index
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {copiedIndex === index ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export function SidebarLeft() {
  const leftTab    = useCvBuilderStore((s) => s.leftTab);
  const setLeftTab = useCvBuilderStore((s) => s.setLeftTab);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
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
          <div className="shrink-0 border-b border-border" style={{ maxHeight: "40%" }}>
            <ScrollArea className="h-full max-h-[320px]">
              <SectionNav />
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1">
            <ActiveSectionForm />
          </ScrollArea>
        </div>
      )}

      {leftTab === "ai" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <AiToolsPanel />
        </div>
      )}
    </div>
  );
}
