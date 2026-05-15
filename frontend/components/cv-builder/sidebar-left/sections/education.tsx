"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvEducationItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvEducationItem {
  return {
    id: nanoid(),
    institution: "",
    degree: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    gpa: "",
    bullets: [],
  };
}

function EducationForm({
  item,
  onChange,
}: {
  item: CvEducationItem;
  onChange: (patch: Partial<CvEducationItem>) => void;
}) {
  const updateBullet = (i: number, val: string) => {
    const b = [...item.bullets]; b[i] = val; onChange({ bullets: b });
  };
  const addBullet    = () => onChange({ bullets: [...item.bullets, ""] });
  const removeBullet = (i: number) => onChange({ bullets: item.bullets.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3">
      <CvField label="Institution" value={item.institution} onChange={(v) => onChange({ institution: v })} placeholder="MIT" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Degree" value={item.degree} onChange={(v) => onChange({ degree: v })} placeholder="Bachelor's" />
        <CvField label="Field" value={item.field} onChange={(v) => onChange({ field: v })} placeholder="Computer Science" />
      </div>
      <CvField label="Location" value={item.location} onChange={(v) => onChange({ location: v })} placeholder="Cambridge, MA" />
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
        <input type="checkbox" checked={item.current} onChange={(e) => onChange({ current: e.target.checked, endDate: "" })} className="rounded" />
        Currently enrolled
      </label>
      <CvField label="GPA (optional)" value={item.gpa} onChange={(v) => onChange({ gpa: v })} placeholder="3.8 / 4.0" />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Notes (optional)</span>
        {item.bullets.map((b, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <CvField value={b} onChange={(v) => updateBullet(i, v)} type="textarea" rows={2} className="flex-1" />
            <button onClick={() => removeBullet(i)} className="mt-2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">✕</button>
          </div>
        ))}
        <button onClick={addBullet} className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2 rounded hover:bg-muted transition-colors">
          <Plus className="h-3 w-3" /> Add note
        </button>
      </div>
    </div>
  );
}

export function EducationSection() {
  const items      = useCvBuilderStore((s) => s.draft?.data.education ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvEducationItem>) =>
    updateData("education", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("education", items.filter((it) => it.id !== id));
  const add = () => {
    const item = emptyItem();
    updateData("education", [item, ...items]);
    setOpen(item.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="education" />
      <div className="px-3 pb-4 flex flex-col gap-2">
        <button onClick={add} className="self-start flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Education
        </button>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            title={item.degree ? `${item.degree}${item.field ? " — " + item.field : ""}` : "New Entry"}
            subtitle={item.institution}
            isOpen={open === item.id}
            onToggle={() => setOpen(open === item.id ? null : item.id)}
            onDelete={() => remove(item.id)}
          >
            <EducationForm item={item} onChange={(p) => update(item.id, p)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No education entries yet.</p>}
      </div>
    </div>
  );
}
