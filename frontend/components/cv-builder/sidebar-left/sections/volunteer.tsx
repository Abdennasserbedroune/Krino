"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvVolunteerItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvVolunteerItem {
  return { id: nanoid(), organization: "", role: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] };
}

function VolunteerForm({ item, onChange, onDelete }: { item: CvVolunteerItem; onChange: (p: Partial<CvVolunteerItem>) => void; onDelete: () => void; }) {
  const updateBullet = (i: number, val: string) => { const b = [...item.bullets]; b[i] = val; onChange({ bullets: b }); };
  const addBullet = () => onChange({ bullets: [...item.bullets, ""] });
  const removeBullet = (i: number) => onChange({ bullets: item.bullets.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Organization" value={item.organization} onChange={(v) => onChange({ organization: v })} placeholder="Red Crescent" />
      <CvField label="Role" value={item.role} onChange={(v) => onChange({ role: v })} placeholder="Volunteer Coordinator" />
      <CvField label="Location" value={item.location} onChange={(v) => onChange({ location: v })} placeholder="Marrakesh, MA" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Start Date" type="month" value={item.startDate} onChange={(v) => onChange({ startDate: v })} />
        <CvField label="End Date" type="month" value={item.current ? "" : item.endDate} onChange={(v) => onChange({ endDate: v })} disabled={item.current} placeholder={item.current ? "Present" : ""} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={item.current} onChange={(e) => onChange({ current: e.target.checked, endDate: "" })} className="rounded" /> Currently active
      </label>
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-xs font-medium text-muted-foreground">Highlights</span>
        {item.bullets.map((b, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <CvField value={b} onChange={(v) => updateBullet(i, v)} type="textarea" rows={2} aiEnabled aiContext="volunteer highlight" className="flex-1" />
            {item.bullets.length > 1 && <button onClick={() => removeBullet(i)} className="mt-1 text-muted-foreground hover:text-destructive">✕</button>}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addBullet} className="self-start text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add bullet</Button>
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function VolunteerSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.volunteer ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvVolunteerItem>) =>
    updateData("volunteer", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("volunteer", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("volunteer", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="volunteer" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Volunteer</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.role || "New Role"} subtitle={item.organization} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <VolunteerForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No volunteer experience yet.</p>}
      </div>
    </div>
  );
}
