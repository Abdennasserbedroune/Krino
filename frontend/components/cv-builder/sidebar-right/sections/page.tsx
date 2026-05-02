"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import { Field } from "@/components/cv-builder/shared/field";
import type { PaperSize } from "@/lib/cv-builder/types";
import { cn } from "@/lib/utils";

export function PageSection() {
  const design = useCvBuilderStore((s) => s.draft?.design);
  const updateDesign = useCvBuilderStore((s) => s.updateDesign);

  if (!design) return null;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Paper size */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Paper Size
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["A4", "Letter"] as PaperSize[]).map((size) => (
            <button
              key={size}
              onClick={() => updateDesign({ paperSize: size })}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-all hover:border-seeker/60",
                design.paperSize === size
                  ? "border-seeker bg-seeker/5 text-seeker"
                  : "border-border text-muted-foreground"
              )}
            >
              {/* Visual paper icon */}
              <div
                className={cn(
                  "border-2 rounded-sm",
                  design.paperSize === size ? "border-seeker/60" : "border-muted-foreground/30"
                )}
                style={{
                  width: size === "A4" ? "24px" : "26px",
                  height: size === "A4" ? "34px" : "32px",
                }}
              />
              {size}
              <span className="text-[10px] opacity-60">
                {size === "A4" ? "210×297mm" : "8.5×11in"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Margins */}
      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
          Margins
        </label>
        <Field label={`Top & Bottom — ${design.marginTop}mm`}>
          <input
            type="range" min="8" max="32" step="1"
            value={design.marginTop}
            onChange={(e) => updateDesign({ marginTop: parseInt(e.target.value) })}
            className="w-full accent-seeker"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Tight 8mm</span><span>Wide 32mm</span>
          </div>
        </Field>
        <Field label={`Left & Right — ${design.marginSide}mm`}>
          <input
            type="range" min="8" max="32" step="1"
            value={design.marginSide}
            onChange={(e) => updateDesign({ marginSide: parseInt(e.target.value) })}
            className="w-full accent-seeker"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Tight 8mm</span><span>Wide 32mm</span>
          </div>
        </Field>
      </div>

      {/* Margin visualizer */}
      <div className="flex justify-center">
        <div
          className="border-2 border-border rounded bg-muted/20 relative"
          style={{ width: 96, height: 130 }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              top: `${(design.marginTop / 32) * 40}%`,
              bottom: `${(design.marginTop / 32) * 40}%`,
              left: `${(design.marginSide / 32) * 40}%`,
              right: `${(design.marginSide / 32) * 40}%`,
            }}
          >
            <div className="w-full h-full border border-dashed border-seeker/40 rounded-sm flex flex-col gap-1 p-1">
              {["70%", "50%", "60%", "45%", "55%"].map((w, i) => (
                <div key={i} className="h-1 rounded-full bg-muted-foreground/30" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
