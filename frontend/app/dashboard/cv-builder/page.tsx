"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_PRESETS } from "@/lib/cv-builder/templates-data";
import { newId } from "@/lib/cv-builder/utils";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Plus, Loader2, CheckCircle2, Sparkles, FileText, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExistingDraft {
  id: string;
  title: string;
  updatedAt?: string;
  template?: string;
}

function formatUpdatedAt(value?: string) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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
          {["90%", "70%", "80%", "60%"].map((w, i) => (
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
        {["80%", "60%", "70%", "50%", "65%", "55%", "75%", "45%"].map((w, i) => (
          <div key={i} className="h-0.5 rounded-full" style={{ background: `${primaryColor}22`, width: w }} />
        ))}
        <div className="h-px mt-0.5" style={{ background: accentColor, opacity: 0.3 }} />
        {["70%", "55%", "65%"].map((w, i) => (
          <div key={i} className="h-0.5 rounded-full mt-0.5" style={{ background: `${primaryColor}18`, width: w }} />
        ))}
      </div>
    </div>
  );
}

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
          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:shadow-md"
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
          <CheckCircle2 className="h-4 w-4 text-primary" />
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

function ExistingDraftCard({
  draft,
  onOpen,
  onDelete,
  deleting,
}: {
  draft: ExistingDraft;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{draft.title || "Untitled Resume"}</p>
              <p className="text-xs text-muted-foreground capitalize">{draft.template || "Resume draft"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated {formatUpdatedAt(draft.updatedAt)}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          title="Delete resume"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={onOpen} className="h-8 text-xs px-3">
          Open editor
        </Button>
      </div>
    </div>
  );
}

export default function CvBuilderIndexPage() {
  const router = useRouter();
  const initialize = useCvBuilderStore((s) => s.initialize);
  const [selectedPreset, setSelectedPreset] = useState<string>("modern");
  const [creating, setCreating] = useState(false);
  const [existingDrafts, setExistingDrafts] = useState<ExistingDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cv-builder/drafts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.drafts ?? [];
        setExistingDrafts(
          rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            updatedAt: row.updatedAt ?? row.updated_at,
            template: row.template ?? row.design?.template,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setExistingDrafts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDrafts(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return;

    setCreating(true);
    const id = newId();
    const draft = preset.draft();
    draft.id = id;

    try {
      const res = await fetch("/api/cv-builder/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          title: draft.title,
          template: draft.design.template,
          data: draft.data,
          design: draft.design,
          section_order: draft.sectionOrder,
        }),
      });

      if (!res.ok) {
        throw new Error(`Create failed (${res.status})`);
      }
    } catch (err) {
      console.warn("[create] backend unavailable, continuing with local draft:", err);
    }

    initialize(draft);
    router.push(`/dashboard/cv-builder/${id}`);
  };

  const handleDelete = async (draftId: string) => {
    setDeletingId(draftId);
    const previous = existingDrafts;
    setExistingDrafts((prev) => prev.filter((draft) => draft.id !== draftId));

    try {
      const res = await fetch(`/api/cv-builder/drafts/${draftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (err) {
      console.error("[delete] failed:", err);
      setExistingDrafts(previous);
    } finally {
      setDeletingId(null);
    }
  };

  const selectedMeta = TEMPLATE_PRESETS.find((p) => p.id === selectedPreset);

  return (
    <div className="max-w-6xl mx-auto px-1 pb-12 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">CV Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build, refine, and export ATS-optimized resumes with a cleaner editor flow.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold">Your resumes</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Reopen saved drafts, continue editing, or clean up old versions.
            </p>
          </div>
          {!loadingDrafts && existingDrafts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {existingDrafts.length} saved {existingDrafts.length === 1 ? "resume" : "resumes"}
            </span>
          )}
        </div>

        {loadingDrafts ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[132px] rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : existingDrafts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {existingDrafts.map((draft) => (
              <ExistingDraftCard
                key={draft.id}
                draft={draft}
                deleting={deletingId === draft.id}
                onOpen={() => router.push(`/dashboard/cv-builder/${draft.id}`)}
                onDelete={() => handleDelete(draft.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No saved resumes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start with a template below and your first draft will appear here.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-muted/40 p-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Sparkles className="h-4 w-4 text-primary" />
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
            Selected: <strong>{selectedMeta?.name}</strong>
            {selectedMeta?.description ? ` — ${selectedMeta.description}` : ""}
          </p>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="gap-2 bg-[#111827] hover:bg-[#1f2937] text-white"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Start with {selectedMeta?.name}
          </Button>
        </div>
      </section>
    </div>
  );
}
