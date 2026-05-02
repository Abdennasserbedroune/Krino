"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvEducationItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
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
  onDelete,
}: {
  item: CvEducationItem;
  onChange: (patch: Partial<CvEducationItem>) => void;
  onDelete: () => void;
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
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Institution" value={item.institution} onChange={(v) => onChange({ institution: v })} placeholder="MIT" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Degree" value={item.degree} onChange={(v) => onChange({ degree: v })} placeholder="Bachelor's" />
        <CvField label="Field of Study" value={item.field} onChange={(v) => onChange({ field: v })} placeholder="Computer Science" />
      </div>
      <CvField label="Location" value={item.location} onChange={(v) => onChange({ location: v })} placeholder="Cambridge, MA" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Start Date" type="month" value={item.startDate} onChange={(v) => onChange({ startDate: v })} />
        <CvField
          label="End Date"
          type="month"
          value={item.current ? "" : item.endDate}
          onChange={(v) => onChange({ endDate: v })}
          disabled={item.current}
          placeholder={item.current ? "Present" : ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={item.current} onChange={(e) => onChange({ current: e.target.checked, endDate: "" })} className="rounded" />
        Currently enrolled
      </label>
      <CvField label="GPA (optional)" value={item.gpa} onChange={(v) => onChange({ gpa: v })} placeholder="3.8 / 4.0" />

      {(item.bullets.length > 0 || true) && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-xs font-medium text-muted-foreground">Additional Notes (optional)</span>
          {item.bullets.map((b, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <CvField value={b} onChange={(v) => updateBullet(i, v)} type="textarea" rows={2} className="flex-1" />
              <button onClick={() => removeBullet(i)} className="mt-1 text-muted-foreground hover:text-destructive transition-colors">✕</button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addBullet} className="self-start text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add note
          </Button>
        </div>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function EducationSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.education ?? []);
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
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Education
        </Button>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            title={item.degree ? `${item.degree} — ${item.field}` : "New Entry"}
            subtitle={item.institution}
            isOpen={open === item.id}
            onToggle={() => setOpen(open === item.id ? null : item.id)}
          >
            <EducationForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No education entries yet.</p>}
      </div>
    </div>
  );
}
