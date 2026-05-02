"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Field } from "@/components/cv-builder/shared/field";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  { label: "Inter",        value: "Inter",         category: "Sans-serif" },
  { label: "Geist",        value: "Geist",         category: "Sans-serif" },
  { label: "DM Sans",      value: "DM Sans",       category: "Sans-serif" },
  { label: "Nunito",       value: "Nunito",        category: "Sans-serif" },
  { label: "Roboto",       value: "Roboto",        category: "Sans-serif" },
  { label: "Source Sans",  value: "Source Sans 3", category: "Sans-serif" },
  { label: "Playfair",     value: "Playfair Display", category: "Serif" },
  { label: "Lora",         value: "Lora",          category: "Serif" },
  { label: "Merriweather", value: "Merriweather",  category: "Serif" },
  { label: "EB Garamond",  value: "EB Garamond",   category: "Serif" },
  { label: "JetBrains",    value: "JetBrains Mono",category: "Mono" },
  { label: "Fira Code",    value: "Fira Code",     category: "Mono" },
];

const SIZE_PRESETS = [
  { label: "XS", value: 8  },
  { label: "S",  value: 9  },
  { label: "M",  value: 10 },
  { label: "L",  value: 11 },
  { label: "XL", value: 12 },
];

const CATEGORIES = ["Sans-serif", "Serif", "Mono"];

export function TypographySection() {
  const design = useCvBuilderStore((s) => s.draft?.design);
  const updateDesign = useCvBuilderStore((s) => s.updateDesign);

  if (!design) return null;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Font family */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Font Family
        </label>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-3">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest block mb-1.5">{cat}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_FAMILIES.filter((f) => f.category === cat).map((font) => (
                <button
                  key={font.value}
                  onClick={() => updateDesign({ fontFamily: font.value })}
                  style={{ fontFamily: font.value }}
                  className={cn(
                    "text-left px-3 py-2 rounded-md border text-sm transition-all hover:border-seeker/60",
                    design.fontFamily === font.value
                      ? "border-seeker bg-seeker/5 text-seeker"
                      : "border-border text-foreground"
                  )}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Font size */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Base Font Size
        </label>
        <div className="flex gap-2">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateDesign({ fontSize: s.value })}
              className={cn(
                "flex-1 py-1.5 rounded-md border text-xs font-medium transition-all hover:border-seeker/60",
                design.fontSize === s.value
                  ? "border-seeker bg-seeker/5 text-seeker"
                  : "border-border text-muted-foreground"
              )}
            >
              {s.label}
              <span className="block text-[10px] opacity-60">{s.value}pt</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-lg border border-border p-3 bg-muted/20">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">Preview</span>
        <div style={{ fontFamily: design.fontFamily, fontSize: `${design.fontSize}pt`, lineHeight: design.lineHeight }}>
          <p className="font-bold text-foreground" style={{ color: design.primaryColor }}>John Doe</p>
          <p className="text-muted-foreground" style={{ fontSize: `${design.fontSize - 1}pt` }}>Senior Software Engineer</p>
          <p className="mt-1" style={{ color: design.accentColor, fontSize: `${design.fontSize - 1}pt` }}>→ Built AI pipelines reducing latency by 40%</p>
        </div>
      </div>
    </div>
  );
}
