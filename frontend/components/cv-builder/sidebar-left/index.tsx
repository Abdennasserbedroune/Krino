"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { SectionKey } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, EyeOff, GripVertical, Sparkles, FileText,
  ChevronUp, ChevronDown, Loader2, Check, Copy,
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

const SECTION_LABELS: Record<SectionKey, string> = {
  basics:         "Personal Info",
  summary:        "Summary",
  experience:     "Experience",
  education:      "Education",
  skills:         "Skills",
  projects:       "Projects",
  certifications: "Certifications",
  languages:      "Languages",
  volunteer:      "Volunteering",
  awards:         "Awards",
  publications:   "Publications",
  references:     "References",
  custom:         "Custom",
};

function SectionNav() {
  const sectionOrder            = useCvBuilderStore((s) => s.draft?.sectionOrder ?? []);
  const activeSection           = useCvBuilderStore((s) => s.activeSection);
  const setActiveSection        = useCvBuilderStore((s) => s.setActiveSection);
  const toggleSectionVisibility = useCvBuilderStore((s) => s.toggleSectionVisibility);
  const moveSectionUp           = useCvBuilderStore((s) => s.moveSectionUp);
  const moveSectionDown         = useCvBuilderStore((s) => s.moveSectionDown);
  const sorted = [...sectionOrder].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col py-1">
      {sorted.map((section, idx) => {
        const isActive = activeSection === section.key;
        const label = SECTION_LABELS[section.key as SectionKey] ?? section.label ?? section.key;
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
            <GripVertical className={cn("h-3.5 w-3.5 shrink-0", isActive ? "opacity-40" : "opacity-0 group-hover:opacity-30")} />
            <span className="flex-1 truncate text-xs font-medium">{label}</span>
            <div className={cn("flex items-center gap-0.5 transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              <button onClick={(e) => { e.stopPropagation(); moveSectionUp(section.key as SectionKey); }} disabled={idx === 0}
                className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive ? "text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20" : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20")}>
                <ChevronUp className="h-3 w-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveSectionDown(section.key as SectionKey); }} disabled={idx === sorted.length - 1}
                className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive ? "text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20" : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20")}>
                <ChevronDown className="h-3 w-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.key as SectionKey); }}
                className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                  isActive ? "text-white/60 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveSectionForm() {
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const Component = SECTION_COMPONENTS[activeSection];
  if (!Component) return null;
  return <Component />;
}

type AiAction = "improve" | "shorten" | "expand" | "tailor" | "quantify" | "keywords" | "tone";

const AI_ACTIONS: { id: AiAction; label: string; description: string }[] = [
  { id: "improve",   label: "Improve",    description: "Make it clearer and more impactful" },
  { id: "shorten",   label: "Shorten",    description: "Trim to the essential points" },
  { id: "expand",    label: "Expand",     description: "Add detail and context" },
  { id: "quantify",  label: "Quantify",   description: "Add metrics and numbers" },
  { id: "keywords",  label: "Keywords",   description: "Inject ATS-friendly keywords" },
  { id: "tone",      label: "Pro Tone",   description: "Make it sound more professional" },
  { id: "tailor",    label: "JD Tailor",  description: "Align with a specific job description" },
];

/**
 * Returns a plain-text snapshot of the active section for AI pre-fill.
 * d.summary is CvSummary = { content: string }, NOT a plain string.
 */
function useSectionContent(): string {
  const draft         = useCvBuilderStore((s) => s.draft);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  if (!draft) return "";
  const d = draft.data;
  switch (activeSection) {
    case "summary":
      return d.summary?.content ?? "";
    case "experience":
      return d.experience?.[0]
        ? `${d.experience[0].position} at ${d.experience[0].company}\n${(d.experience[0].bullets ?? []).join("\n")}`
        : "";
    case "education":
      return d.education?.[0]
        ? `${d.education[0].degree} ${d.education[0].field} at ${d.education[0].institution}`
        : "";
    case "skills":
      return (d.skills ?? []).flatMap((g) => g.items).join(", ");
    case "projects":
      return d.projects?.[0]
        ? `${d.projects[0].name}: ${d.projects[0].description ?? ""}`
        : "";
    default:
      return "";
  }
}

function AiToolsTab() {
  const draft         = useCvBuilderStore((s) => s.draft);
  const activeSection = useCvBuilderStore((s) => s.activeSection);
  const autoContent   = useSectionContent();

  const [current,  setCurrent]  = useState("");
  const [action,   setAction]   = useState<AiAction>("improve");
  const [jd,       setJd]       = useState("");
  const [loading,  setLoading]  = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [copied,   setCopied]   = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const sectionLabel = SECTION_LABELS[activeSection] ?? activeSection;
  const actionMeta   = AI_ACTIONS.find(a => a.id === action)!;

  const handleSuggest = async () => {
    const text = current.trim() || autoContent.trim();
    if (!draft?.id || !text) return;
    setLoading(true); setError(null); setVariants([]); setCopied(null);
    try {
      const res = await fetch("/api/cv-builder/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id, section: activeSection,
          field: activeSection, currentValue: text,
          action, jdText: jd || undefined,
        }),
      });
      if (!res.ok) throw new Error(`AI suggest failed (${res.status})`);
      const data = await res.json();

      // Guard: normalise on the client side too — ensure we always get string[]
      let safeVariants: string[];
      if (Array.isArray(data.variants)) {
        safeVariants = data.variants.map((v: unknown) =>
          typeof v === "string" ? v : JSON.stringify(v)
        );
      } else if (data.variants && typeof data.variants === "object") {
        safeVariants = Object.values(data.variants as Record<string, unknown>).map((v) =>
          typeof v === "string" ? v : JSON.stringify(v)
        );
      } else {
        safeVariants = [];
      }

      setVariants(safeVariants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1800);
  };

  const effectiveText = current.trim() || autoContent;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-[#111827] dark:text-white" />
        <p className="text-xs font-semibold">AI Writing — <span className="font-normal text-muted-foreground">{sectionLabel}</span></p>
      </div>

      <div className="flex flex-wrap gap-1">
        {AI_ACTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => setAction(a.id)}
            title={a.description}
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

      <p className="text-[11px] text-muted-foreground -mt-1">{actionMeta.description}</p>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Text to enhance</label>
          {autoContent && !current && (
            <span className="text-[10px] text-muted-foreground/70 italic">Auto-filled from {sectionLabel}</span>
          )}
        </div>
        <textarea
          value={current || autoContent}
          onChange={e => setCurrent(e.target.value)}
          placeholder={`Your ${sectionLabel} content…`}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#111827]"
          rows={4}
        />
      </div>

      {action === "tailor" && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Job Description</label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#111827]"
            rows={4}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={handleSuggest}
        disabled={loading || !effectiveText}
        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[#111827] text-white text-xs font-medium hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? "Generating…" : `${actionMeta.label} with AI`}
      </button>

      {variants.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {variants.length} Suggestion{variants.length > 1 ? "s" : ""}
          </p>
          {variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-border p-3 bg-background">
              <p className="text-xs leading-relaxed mb-2 whitespace-pre-wrap">{String(v)}</p>
              <button
                onClick={() => handleCopy(String(v), i)}
                className={cn(
                  "flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-medium transition-colors",
                  copied === i
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {copied === i
                  ? <><Check className="h-3 w-3" /> Copied!</>
                  : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarLeft() {
  const leftTab    = useCvBuilderStore((s) => s.leftTab);
  const setLeftTab = useCvBuilderStore((s) => s.setLeftTab);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="border-b border-border px-2 py-2 shrink-0">
        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "content" | "ai")}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="content" className="flex-1 text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />Content
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs gap-1">
              <Sparkles className="h-3.5 w-3.5" />AI Tools
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {leftTab === "content" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="shrink-0 max-h-[45%] overflow-y-auto border-b border-border">
            <SectionNav />
          </div>
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
