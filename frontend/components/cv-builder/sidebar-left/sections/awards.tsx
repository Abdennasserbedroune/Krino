"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvAwardItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvAwardItem {
  return { id: nanoid(), title: "", issuer: "", date: "", description: "" };
}

function AwardForm({ item, onChange, onDelete }: { item: CvAwardItem; onChange: (p: Partial<CvAwardItem>) => void; onDelete: () => void; }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Award Title" value={item.title} onChange={(v) => onChange({ title: v })} placeholder="Best Innovation Award" />
      <CvField label="Issuing Body" value={item.issuer} onChange={(v) => onChange({ issuer: v })} placeholder="IEEE" />
      <CvField label="Date" type="month" value={item.date} onChange={(v) => onChange({ date: v })} />
      <CvField label="Description" type="textarea" rows={3} value={item.description} onChange={(v) => onChange({ description: v })} placeholder="What this award recognizes..." aiEnabled aiContext="award description" />
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function AwardsSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.awards ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvAwardItem>) =>
    updateData("awards", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("awards", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("awards", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="awards" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Award</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.title || "New Award"} subtitle={item.issuer} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <AwardForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No awards yet.</p>}
      </div>
    </div>
  );
}
