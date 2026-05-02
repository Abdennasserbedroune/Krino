"use client";

import { useCvBuilderStore } from "@/lib/cv-builder/store";
import type { CvBasics } from "@/lib/cv-builder/types";
import { CvField } from "@/components/cv-builder/shared/field";
import { SectionHeader } from "@/components/cv-builder/shared/section-header";

export function BasicsSection() {
  const basics = useCvBuilderStore((s) => s.draft?.data.basics);
  const updateData = useCvBuilderStore((s) => s.updateData);

  if (!basics) return null;

  const update = (patch: Partial<CvBasics>) =>
    updateData("basics", { ...basics, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader sectionKey="basics" />

      <div className="flex flex-col gap-3 px-4 pb-4">
        <CvField
          label="Full Name"
          value={basics.name}
          onChange={(v) => update({ name: v })}
          placeholder="Abdennasser Bedroune"
        />
        <CvField
          label="Headline"
          value={basics.headline}
          onChange={(v) => update({ headline: v })}
          placeholder="AI Engineer · Full-Stack Developer"
        />
        <div className="grid grid-cols-2 gap-3">
          <CvField
            label="Email"
            type="email"
            value={basics.email}
            onChange={(v) => update({ email: v })}
            placeholder="you@example.com"
          />
          <CvField
            label="Phone"
            type="tel"
            value={basics.phone}
            onChange={(v) => update({ phone: v })}
            placeholder="+212 6 00 00 00 00"
          />
        </div>
        <CvField
          label="Location"
          value={basics.location}
          onChange={(v) => update({ location: v })}
          placeholder="Marrakesh, Morocco"
        />
        <CvField
          label="Website"
          type="url"
          value={basics.website}
          onChange={(v) => update({ website: v })}
          placeholder="https://yoursite.com"
        />
        <CvField
          label="LinkedIn"
          type="url"
          value={basics.linkedin}
          onChange={(v) => update({ linkedin: v })}
          placeholder="https://linkedin.com/in/..."
        />
        <CvField
          label="GitHub"
          type="url"
          value={basics.github}
          onChange={(v) => update({ github: v })}
          placeholder="https://github.com/..."
        />
        <CvField
          label="Twitter / X"
          type="url"
          value={basics.twitter}
          onChange={(v) => update({ twitter: v })}
          placeholder="https://x.com/..."
        />
      </div>
    </div>
  );
}
