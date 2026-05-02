"use client";

import { useState } from "react";
import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvCertificationItem } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { ItemCard } from "@/components/cv-builder/shared/item-card";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";

function emptyItem(): CvCertificationItem {
  return { id: nanoid(), name: "", issuer: "", date: "", expirationDate: "", credentialId: "", url: "" };
}

function CertForm({ item, onChange, onDelete }: { item: CvCertificationItem; onChange: (p: Partial<CvCertificationItem>) => void; onDelete: () => void; }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <CvField label="Certificate Name" value={item.name} onChange={(v) => onChange({ name: v })} placeholder="AWS Solutions Architect" />
      <CvField label="Issuing Organization" value={item.issuer} onChange={(v) => onChange({ issuer: v })} placeholder="Amazon Web Services" />
      <div className="grid grid-cols-2 gap-2">
        <CvField label="Issue Date" type="month" value={item.date} onChange={(v) => onChange({ date: v })} />
        <CvField label="Expiration (optional)" type="month" value={item.expirationDate} onChange={(v) => onChange({ expirationDate: v })} />
      </div>
      <CvField label="Credential ID" value={item.credentialId} onChange={(v) => onChange({ credentialId: v })} placeholder="ABC-123456" />
      <CvField label="Credential URL" type="url" value={item.url} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-end text-xs h-7 mt-1">Delete</Button>
    </div>
  );
}

export function CertificationsSection() {
  const items = useCvBuilderStore((s) => s.draft?.data.certifications ?? []);
  const updateData = useCvBuilderStore((s) => s.updateData);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CvCertificationItem>) =>
    updateData("certifications", items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => updateData("certifications", items.filter((it) => it.id !== id));
  const add = () => { const item = emptyItem(); updateData("certifications", [item, ...items]); setOpen(item.id); };

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader sectionKey="certifications" />
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={add} className="self-start h-8"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Certification</Button>
        {items.map((item) => (
          <ItemCard key={item.id} title={item.name || "New Certification"} subtitle={item.issuer} isOpen={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)}>
            <CertForm item={item} onChange={(p) => update(item.id, p)} onDelete={() => remove(item.id)} />
          </ItemCard>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No certifications yet.</p>}
      </div>
    </div>
  );
}
