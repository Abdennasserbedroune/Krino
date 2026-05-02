"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvPublicationItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvPublicationItem {
  return { id: nanoid(), title: "", publisher: "", date: "", url: "", description: "" };
}

function PublicationForm({ item, onChange, onDelete }: { item: CvPublicationItem; onChange: (p: Partial<CvPublicationItem>) => void; onDelete: () => void; }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Title" value={item.title} onChange={(v) => onChange({ title: v })} placeholder="Deep Learning for NLP" />
      <CvField label="Publisher / Journal" value={item.publisher} onChange={(v) => onChange({ publisher: v })} placeholder="arXiv" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Date" type="month" value={item.date} onChange={(v) => onChange({ date: v })} />
        <CvField label="URL" type="url" value={item.url} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
      </div>
      <CvField label="Abstract / Description" type="textarea" rows={3} value={item.description} onChange={(v) => onChange({ description: v })} placeholder="Brief summary of the publication..." aiEnabled aiContext="publication abstract" />
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function PublicationsSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.publications ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvPublicationItem>) =>
    updateData("publications", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("publications", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("publications", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="publications" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Publication</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.title || "New Publication"} subtitle={item.publisher} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <PublicationForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No publications yet.</p>}
      </div>
    </div>
  );
}
