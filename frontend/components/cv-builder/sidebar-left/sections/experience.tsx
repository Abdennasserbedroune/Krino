"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvExperienceItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvExperienceItem {
  return {
    id: nanoid(),
    company: "",
    position: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [""],
  };
}

function ExperienceForm({
  item,
  onChange,
}: {
  item: CvExperienceItem;
  onChange: (patch: Partial<CvExperienceItem>) => void;
}) {
  const updateBullet = (i: number, val: string) => {
    const bullets = [...item.bullets];
    bullets[i] = val;
    onChange({ bullets });
  };
  const addBullet = () => onChange({ bullets: [...item.bullets, ""] });
  const removeBullet = (i: number) =>
    onChange({ bullets: item.bullets.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3">
      <CvField label="Company" value={item.company} onChange={(v) => onChange({ company: v })} placeholder="Acme Corp" />
      <CvField label="Position" value={item.position} onChange={(v) => onChange({ position: v })} placeholder="Software Engineer" />
      <CvField label="Location" value={item.location} onChange={(v) => onChange({ location: v })} placeholder="Remote" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Start" type="month" value={item.startDate} onChange={(v) => onChange({ startDate: v })} />
        <CvField
          label="End"
          type="month"
          value={item.current ? "" : item.endDate}
          onChange={(v) => onChange({ endDate: v })}
          disabled={item.current}
          placeholder={item.current ? "Present" : ""}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.current}
          onChange={(e) => onChange({ current: e.target.checked, endDate: "" })}
          className="rounded"
        />
        Currently working here
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Bullet Points</span>
        {item.bullets.map((b, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <CvField
              value={b}
              onChange={(v) => updateBullet(i, v)}
              placeholder={`Achievement or responsibility ${i + 1}`}
              type="textarea"
              rows={2}
              className="flex-1"
            />
            {item.bullets.length > 1 && (
              <button
                onClick={() => removeBullet(i)}
                className="mt-2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Remove bullet"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addBullet}
          className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-7 px-2 rounded hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> Add bullet
        </button>
      </div>
    </div>
  );
}

export function ExperienceSection() {
  const items      = useCvBuilderStore((s) => s.draft?.data.experience ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvExperienceItem>) =>
    updateData("experience", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const remove = (id: string) =>
    updateData("experience", items.filter((it) => it.id !== id));

  const add = () => {
    const item = emptyItem();
    updateData("experience", [item, ...items]);
    setOpen(item.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="experience" />

      <div className="px-3 pb-4 flex flex-col gap-2">
        <button
          onClick={add}
          className="self-start flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Experience
        </button>

        {items.map((item) => (
          <ItemCard
            key={item.id}
            title={item.position || "New Position"}
            subtitle={item.company}
            isOpen={open === item.id}
            onToggle={() => setOpen(open === item.id ? null : item.id)}
            onDelete={() => remove(item.id)}
          >
            <ExperienceForm item={item} onChange={(patch) => update(item.id, patch)} />
          </ItemCard>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No experience entries yet.
          </p>
        )}
      </div>
    </div>
  );
}
