"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvReferenceItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvReferenceItem {
  return { id: nanoid(), name: "", position: "", company: "", email: "", phone: "" };
}

function ReferenceForm({ item, onChange, onDelete }: { item: CvReferenceItem; onChange: (p: Partial<CvReferenceItem>) => void; onDelete: () => void; }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Full Name" value={item.name} onChange={(v) => onChange({ name: v })} placeholder="Jane Smith" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Position" value={item.position} onChange={(v) => onChange({ position: v })} placeholder="Engineering Manager" />
        <CvField label="Company" value={item.company} onChange={(v) => onChange({ company: v })} placeholder="Acme Inc." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Email" type="email" value={item.email} onChange={(v) => onChange({ email: v })} placeholder="jane@acme.com" />
        <CvField label="Phone" type="tel" value={item.phone} onChange={(v) => onChange({ phone: v })} placeholder="+1 555 000 0000" />
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function ReferencesSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.references ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvReferenceItem>) =>
    updateData("references", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("references", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("references", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="references" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Reference</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.name || "New Reference"} subtitle={`${item.position}${item.company ? ` · ${item.company}` : ""}`} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <ReferenceForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No references yet.</p>}
      </div>
    </div>
  );
}
