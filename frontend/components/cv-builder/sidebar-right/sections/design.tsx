"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Field } from "@/components/cv-builder/shared/field";
import { cn } from "@/lib/utils";

const PRESET_PALETTES = [
  { label: "Slate",    primary: "#111111", accent: "#3b82f6" },
  { label: "Forest",   primary: "#1a2e1a", accent: "#16a34a" },
  { label: "Crimson",  primary: "#1c0a0a", accent: "#dc2626" },
  { label: "Violet",   primary: "#120a1c", accent: "#7c3aed" },
  { label: "Amber",    primary: "#1c1200", accent: "#d97706" },
  { label: "Teal",     primary: "#041a1a", accent: "#0d9488" },
  { label: "Rose",     primary: "#1a0810", accent: "#e11d48" },
  { label: "Neutral",  primary: "#111111", accent: "#6b7280" },
];

export function DesignSection() {
  const design = useCvBuilderStore((s) => s.draft?.design);
  const updateDesign = useCvBuilderStore((s) => s.updateDesign);

  if (!design) return null;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Color Presets */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Color Palette
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_PALETTES.map((p) => (
            <button
              key={p.label}
              onClick={() => updateDesign({ primaryColor: p.primary, accentColor: p.accent })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all hover:border-seeker/60",
                design.primaryColor === p.primary && design.accentColor === p.accent
                  ? "border-seeker ring-1 ring-seeker/30"
                  : "border-border"
              )}
            >
              <div className="flex gap-1">
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: p.primary }}
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: p.accent }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual color pickers */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.primaryColor}
              onChange={(e) => updateDesign({ primaryColor: e.target.value })}
              className="w-9 h-9 rounded-md border border-border cursor-pointer bg-background p-0.5"
            />
            <input
              type="text"
              value={design.primaryColor}
              onChange={(e) => updateDesign({ primaryColor: e.target.value })}
              maxLength={7}
              className="flex-1 h-9 rounded-md border border-border bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-seeker/60"
            />
          </div>
        </Field>
        <Field label="Accent Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.accentColor}
              onChange={(e) => updateDesign({ accentColor: e.target.value })}
              className="w-9 h-9 rounded-md border border-border cursor-pointer bg-background p-0.5"
            />
            <input
              type="text"
              value={design.accentColor}
              onChange={(e) => updateDesign({ accentColor: e.target.value })}
              maxLength={7}
              className="flex-1 h-9 rounded-md border border-border bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-seeker/60"
            />
          </div>
        </Field>
      </div>

      {/* Spacing */}
      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
          Spacing
        </label>
        <Field label={`Line Height — ${design.lineHeight.toFixed(1)}`}>
          <input
            type="range" min="1.0" max="2.0" step="0.1"
            value={design.lineHeight}
            onChange={(e) => updateDesign({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-seeker"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Tight</span><span>Relaxed</span>
          </div>
        </Field>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
          Display Options
        </label>
        {([
          { key: "showIcons",  label: "Show section icons" },
          { key: "showBorder", label: "Show decorative border" },
        ] as const).map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
            <button
              role="switch"
              aria-checked={design[key]}
              onClick={() => updateDesign({ [key]: !design[key] })}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                design[key] ? "bg-seeker" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  design[key] ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
