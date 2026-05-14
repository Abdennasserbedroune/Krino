"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_PRESETS } from "@/lib/cv-builder/templates-data";
import { newId } from "@/lib/cv-builder/utils";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Plus, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      {/* Thumbnail */}
      <div className="h-44 p-3" style={{ background: `${preset.primaryColor}08` }}>
        <CvThumbnail
          primaryColor={preset.primaryColor}
          accentColor={preset.accentColor}
          templateId={preset.templateId}
        />
      </div>
      {/* Label */}
      <div className="px-3 py-3 border-t border-border/50 bg-card">
        <p className="text-sm font-semibold">{preset.name}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{preset.description}</p>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CvBuilderIndexPage() {
  const router     = useRouter();
  const initialize = useCvBuilderStore((s) => s.initialize);
  const [selectedPreset, setSelectedPreset] = useState<string>("modern");
  const [creating, setCreating] = useState(false);

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

      {/* Template picker — always visible */}
      <div className="rounded-2xl border border-border bg-muted/40 p-6">
        {/* Section heading */}
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Choose a starting template</h2>
          <span className="text-xs text-muted-foreground ml-1">
            — pre-filled with sample data, fully editable
          </span>
        </div>

        {/* Template grid — 3 cols on mobile, 6 on larger screens */}
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

        {/* Footer: description + CTA */}
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
