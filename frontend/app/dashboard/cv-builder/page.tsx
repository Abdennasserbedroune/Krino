"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_PRESETS } from "@/lib/cv-builder/templates-data";
import { newId } from "@/lib/cv-builder/utils";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Plus, Loader2, FileText, Clock, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Static mock saved resumes ────────────────────────────────────────────────
const MOCK_RESUMES = [
  {
    id: "demo-1",
    title: "Software Engineer — Google",
    updatedAt: "2026-04-30T18:22:00Z",
    templateId: "modern",
    accentColor: "#7c3aed",
    primaryColor: "#0f172a",
  },
  {
    id: "demo-2",
    title: "Full-Stack Dev — Remote",
    updatedAt: "2026-04-28T09:10:00Z",
    templateId: "sidebar",
    accentColor: "#0369a1",
    primaryColor: "#0c1a2e",
  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Mini CV thumbnail ────────────────────────────────────────────────────────
function CvThumbnail({
  primaryColor,
  accentColor,
  templateId,
}: {
  primaryColor: string;
  accentColor: string;
  templateId: string;
}) {
  const isSidebar = templateId === "sidebar";
  return (
    <div className="w-full h-full bg-white rounded overflow-hidden flex" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}>
      {isSidebar && (
        <div className="w-[28%] h-full flex flex-col gap-1 p-1.5" style={{ background: primaryColor }}>
          <div className="w-5 h-5 rounded-full self-center mb-1" style={{ background: accentColor }} />
          <div className="h-1 rounded-full opacity-70" style={{ background: "rgba(255,255,255,0.6)", width: "80%" }} />
          <div className="h-1 rounded-full opacity-50" style={{ background: "rgba(255,255,255,0.4)", width: "60%" }} />
          {["90%","70%","80%","60%"].map((w, i) => (
            <div key={i} className="h-0.5 rounded-full mt-0.5" style={{ background: "rgba(255,255,255,0.25)", width: w }} />
          ))}
        </div>
      )}
      <div className={cn("flex flex-col gap-1 p-2", isSidebar ? "flex-1" : "w-full")}>
        {/* name line */}
        {templateId === "creative" ? (
          <div className="h-6 rounded-sm -mx-2 -mt-2 mb-1" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
        ) : (
          <div className="h-1.5 rounded-full" style={{ background: primaryColor, width: "65%", opacity: 0.9 }} />
        )}
        <div className="h-0.5 rounded-full" style={{ background: accentColor, width: "40%" }} />
        <div className="h-px" style={{ background: accentColor, opacity: 0.4 }} />
        {/* content lines */}
        {["80%","60%","70%","50%","65%","55%","75%","45%"].map((w, i) => (
          <div key={i} className="h-0.5 rounded-full" style={{ background: `${primaryColor}22`, width: w }} />
        ))}
        <div className="h-px mt-0.5" style={{ background: accentColor, opacity: 0.3 }} />
        {["70%","55%","65%"].map((w, i) => (
          <div key={i} className="h-0.5 rounded-full mt-0.5" style={{ background: `${primaryColor}18`, width: w }} />
        ))}
      </div>
    </div>
  );
}

// ─── Saved resume card ────────────────────────────────────────────────────────
function ResumeCard({ resume, onOpen, onDelete }: {
  resume: typeof MOCK_RESUMES[number];
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={onOpen}
    >
      <div className="h-36 p-3" style={{ background: `${resume.primaryColor}08` }}>
        <CvThumbnail primaryColor={resume.primaryColor} accentColor={resume.accentColor} templateId={resume.templateId} />
      </div>
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{resume.title}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{timeAgo(resume.updatedAt)}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Template picker card ─────────────────────────────────────────────────────
function TemplateCard({ preset, selected, onSelect }: {
  preset: typeof TEMPLATE_PRESETS[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-200 text-left group",
        selected
          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:shadow-md"
      )}
    >
      {preset.badge && (
        <span className="absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ background: preset.accentColor, color: "#fff" }}>
          {preset.badge}
        </span>
      )}
      {selected && (
        <span className="absolute top-2 left-2 z-10">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </span>
      )}
      <div className="h-36 p-3" style={{ background: `${preset.primaryColor}08` }}>
        <CvThumbnail primaryColor={preset.primaryColor} accentColor={preset.accentColor} templateId={preset.templateId} />
      </div>
      <div className="px-3 py-2.5 border-t border-border/50 bg-card">
        <p className="text-sm font-semibold">{preset.name}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{preset.description}</p>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CvBuilderIndexPage() {
  const router  = useRouter();
  const initialize = useCvBuilderStore((s) => s.initialize);
  const [resumes, setResumes] = useState(MOCK_RESUMES);
  const [selectedPreset, setSelectedPreset] = useState<string>("modern");
  const [creating, setCreating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleCreate = () => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return;
    setCreating(true);
    const id = newId();
    const draft = preset.draft();
    draft.id = id;
    initialize(draft);
    router.push(`/dashboard/cv-builder/${id}`);
  };

  const handleDeleteResume = (id: string) =>
    setResumes((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="max-w-5xl mx-auto px-1">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CV Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build, design, and export ATS-optimized resumes.</p>
        </div>
        <Button
          onClick={() => setShowPicker((v) => !v)}
          className="gap-2 bg-[#111827] hover:bg-[#1f2937] text-white"
        >
          <Plus className="h-4 w-4" /> New Resume
        </Button>
      </div>

      {/* ── Template picker (inline, toggleable) ── */}
      {showPicker && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Choose a starting template</h2>
            <span className="text-xs text-muted-foreground ml-1">— pre-filled with sample data, fully editable</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
            {TEMPLATE_PRESETS.map((preset) => (
              <TemplateCard
                key={preset.id}
                preset={preset}
                selected={selectedPreset === preset.id}
                onSelect={() => setSelectedPreset(preset.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Selected: <strong>{TEMPLATE_PRESETS.find((p) => p.id === selectedPreset)?.name}</strong>
              {" — "}{TEMPLATE_PRESETS.find((p) => p.id === selectedPreset)?.description}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPicker(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1.5 bg-[#111827] hover:bg-[#1f2937] text-white">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Start with {TEMPLATE_PRESETS.find((p) => p.id === selectedPreset)?.name}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved resumes grid ── */}
      {resumes.length === 0 && !showPicker ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No resumes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Pick a template above to get started</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Resumes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {resumes.map((r) => (
              <ResumeCard
                key={r.id}
                resume={r}
                onOpen={() => router.push(`/dashboard/cv-builder/${r.id}`)}
                onDelete={() => handleDeleteResume(r.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
