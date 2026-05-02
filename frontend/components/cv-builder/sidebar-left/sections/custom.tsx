"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvCustomSection, CvCustomItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

function emptySection(): CvCustomSection {
  return { id: nanoid(), heading: "Custom Section", items: [], visible: true };
}
function emptyItem(): CvCustomItem {
  return { id: nanoid(), title: "", subtitle: "", date: "", bullets: [""] };
}

function CustomItemForm({ item, onChange, onDelete }: { item: CvCustomItem; onChange: (p: Partial<CvCustomItem>) => void; onDelete: () => void; }) {
  const updateBullet = (i: number, val: string) => { const b = [...item.bullets]; b[i] = val; onChange({ bullets: b }); };
  const addBullet = () => onChange({ bullets: [...item.bullets, ""] });
  const removeBullet = (i: number) => onChange({ bullets: item.bullets.filter((_, idx) => idx !== i) });
  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Title" value={item.title} onChange={(v) => onChange({ title: v })} placeholder="Item title" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Subtitle" value={item.subtitle} onChange={(v) => onChange({ subtitle: v })} placeholder="Subtitle" />
        <CvField label="Date" value={item.date} onChange={(v) => onChange({ date: v })} placeholder="2024" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Details</span>
        {item.bullets.map((b, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <CvField value={b} onChange={(v) => updateBullet(i, v)} type="textarea" rows={2} aiEnabled aiContext="custom section detail" className="flex-1" />
            {item.bullets.length > 1 && <button onClick={() => removeBullet(i)} className="mt-1 text-muted-foreground hover:text-destructive">✕</button>}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addBullet} className="self-start text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add detail</Button>
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7">Delete</Button>
    </div>
  );
}

function CustomSectionBlock({ section, onUpdate, onDelete }: { section: CvCustomSection; onUpdate: (p: Partial<CvCustomSection>) => void; onDelete: () => void; }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const updateItem = (id: string, patch: Partial<CvCustomItem>) =>
    onUpdate({ items: section.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeItem = (id: string) => onUpdate({ items: section.items.filter((it) => it.id !== id) });
  const addItem = () => { const item = emptyItem(); onUpdate({ items: [...section.items, item] }); setOpenItem(item.id); };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
        <button onClick={() => setIsOpen(!isOpen)} className="flex-1 flex items-center justify-between">
          <input
            value={section.heading}
            onChange={(e) => onUpdate({ heading: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-sm font-medium focus:outline-none focus:border-b border-border w-full text-left"
            placeholder="Section Heading"
          />
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete section">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="p-3 flex flex-col gap-2">
          {section.items.map((item) => (
            <ItemCard key={item.id} title={item.title || "New Item"} subtitle={item.subtitle} isOpen={openItem === item.id} onToggle={() => setOpenItem(openItem === item.id ? null : item.id)}>
              <CustomItemForm item={item} onChange={(p) => updateItem(item.id, p)} onDelete={() => removeItem(item.id)} />
            </ItemCard>
          ))}
          <Button variant="ghost" size="sm" onClick={addItem} className="self-start text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>
      )}
    </div>
  );
}

export function CustomSection() {
  const sections = useCvBuilderStore((s) => s.draft?.data.customSections ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);

  const update = (id: string, patch: Partial<CvCustomSection>) =>
    updateData("customSections", sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => updateData("customSections", sections.filter((s) => s.id !== id));
  const add = () => updateData("customSections", [...sections, emptySection()]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex items-center justify-between pt-4">
        <span className="text-sm font-semibold">Custom Sections</span>
        <Button variant="outline" size="sm" onClick={add} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Section
        </Button>
      </div>
      {sections.map((section) => (
        <CustomSectionBlock key={section.id} section={section} onUpdate={(p) => update(section.id, p)} onDelete={() => remove(section.id)} />
      ))}
      {sections.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Add custom sections for anything that doesn't fit above.</p>}
    </div>
  );
}
