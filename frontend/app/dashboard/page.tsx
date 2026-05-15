"use client";

import Protected from "@/components/Protected";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import dynamic from "next/dynamic";

const DesiredJobPage = dynamic(() => import("./desired-job/page"), { ssr: false });

export default function DashboardIndexPage() {
  const { t } = useLanguage();

  return (
    <Protected>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        <div className="page-overline-badge">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--seeker)", display: "inline-block", flexShrink: 0 }} />
          <span>Job Seeker · Career Match</span>
        </div>
        <h1 className="page-h1">{t.careerMatch.subtitle}</h1>
        <p className="page-subtitle">{t.hero.subSeeker}</p>
      </div>

      {/* Content card */}
      <div className="page-card-shell">
        <div className="page-card-inner">
          <DesiredJobPage onSwitchToChat={() => { window.location.href = "/dashboard/chat"; }} />
        </div>
      </div>
    </Protected>
  );
}
