"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_PRESETS } from "@/lib/cv-builder/templates-data";
import { newId } from "@/lib/cv-builder/utils";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Plus, Loader2, CheckCircle2, Sparkles, FileText, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraftListItem {
  id: string;
  title: string;
  updated_at: string;
  template?: string;
}

// ─── Mini CV thumbnail ──────────────────────────────────────────────────────────
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
        {templateId === "creative" ? (
          <div className="h-6 rounded-sm -mx-2 -mt-2 mb-1" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
        ) : (
          <div className="h-1.5 rounded-full" style={{ background: primaryColor, width: "65%", opacity: 0.9 }} />
        )}
        <div className="h-0.5 rounded-full" style={{ background: accentColor, width: "40%" }} />
        <div className="h-px" style={{ background: accentColor, opacity: 0.4 }} />
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

// ─── Template picker card ────────────────────────────────────────────────────────
function TemplateCard({ preset, selected, onSelect }: {
  preset: typeof TEMPLATE_PRESETS[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-200 text-left group w-full",
        selected
          ? "border-[#111827] shadow-lg ring-2 ring-[#111827]/20"
          : "border-border hover:border-[#111827]/40 hover:shadow-md"
      )}
    >
      {preset.badge && (
        <span
          className="absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ background: preset.accentColor, color: "#fff" }}
        >
          {preset.badge}
        </span>
      )}
      {selected && (
        <span className="absolute top-2 left-2 z-10">
          <CheckCircle2 className="h-4 w-4" style={{ color: "#111827" }} />
        </span>
      )}
      <div className="h-44 p-3" style={{ background: `${preset.primaryColor}08` }}>
        <CvThumbnail
          primaryColor={preset.primaryColor}
          accentColor={preset.accentColor}
          templateId={preset.templateId}
        />
      </div>
      <div className="px-3 py-3 border-t border-border/50 bg-card">
        <p className="text-sm font-semibold">{preset.name}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{preset.description}</p>
      </div>
    </button>
  );
}

// ─── Existing draft row ─────────────────────────────────────────────────────────
function DraftRow({ draft, onOpen, onDelete }: {
  draft: DraftListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this resume?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/cv-builder/drafts/${draft.id}`, { method: "DELETE" });
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 w-full rounded-xl border border-border bg-card hover:border-[#111827]/30 hover:shadow-sm px-4 py-3 text-left transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-[#111827]/5 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-[#111827]/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{draft.title || "Untitled Resume"}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3" />
          {relativeTime(draft.updated_at)}
        </p>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label="Delete resume"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CvBuilderIndexPage() {
  const router     = useRouter();
  const initialize = useCvBuilderStore((s) => s.initialize);
  const [selectedPreset, setSelectedPreset] = useState<string>("modern");
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);

  // Load existing drafts from API
  useEffect(() => {
    fetch("/api/cv-builder/drafts")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDrafts(Array.isArray(data) ? data : data.drafts ?? []))
      .catch(() => {})
      .finally(() => setDraftsLoading(false));
  }, []);

  const handleCreate = async () => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset || creating) return;
    setCreating(true);
    try {
      const id = newId();
      const draft = preset.draft();
      draft.id = id;

      // POST to backend first — so the editor page can load it from the API
      await fetch("/api/cv-builder/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: draft.title,
          template: draft.design.template,
          data: draft.data,
          design: draft.design,
          section_order: draft.sectionOrder,
        }),
      });

      // Pre-load into store so the editor page skips the fetch
      initialize(draft);
      router.push(`/dashboard/cv-builder/${id}`);
    } catch {
      // Even if the POST fails, pre-load into store so the editor can still open
      const preset = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset)!;
      const id = newId();
      const draft = preset.draft();
      draft.id = id;
      initialize(draft);
      router.push(`/dashboard/cv-builder/${id}`);
    }
  };

  const selectedMeta = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset);

  return (
    <div className="max-w-5xl mx-auto px-1 pb-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">CV Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build, design, and export ATS-optimized resumes.
        </p>
      </div>

      {/* Existing drafts */}
      {(draftsLoading || drafts.length > 0) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Your Resumes</h2>
          {draftsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drafts.map(d => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  onOpen={() => router.push(`/dashboard/cv-builder/${d.id}`)}
                  onDelete={() => setDrafts(prev => prev.filter(x => x.id !== d.id))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template picker */}
      <div className="rounded-2xl border border-border bg-muted/40 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4" style={{ color: "#111827" }} />
          <h2 className="text-sm font-semibold">Choose a starting template</h2>
          <span className="text-xs text-muted-foreground ml-1">
            — pre-filled with sample data, fully editable
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {TEMPLATE_PRESETS.map((preset) => (
            <TemplateCard
              key={preset.id}
              preset={preset}
              selected={selectedPreset === preset.id}
              onSelect={() => setSelectedPreset(preset.id)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Selected:{" "}
            <strong>{selectedMeta?.name}</strong>
            {selectedMeta?.description ? ` — ${selectedMeta.description}` : ""}
          </p>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="gap-2 bg-[#111827] hover:bg-[#1f2937] text-white"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Start with {selectedMeta?.name}
          </Button>
        </div>
      </div>
    </div>
  );
}
