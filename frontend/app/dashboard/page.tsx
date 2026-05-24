"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";
import Protected from "@/components/Protected";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import dynamic from "next/dynamic";

const DesiredJobPage = dynamic(() => import("./desired-job/page"), { ssr: false });

export default function DashboardIndexPage() {
  const { role, loading } = useAuthContext();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && role === "recruiter") {
      router.replace("/dashboard/recruiter");
    }
  }, [role, loading, router]);

  if (loading || role === "recruiter") return null;

  return (
    <Protected>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        <div className="page-overline-badge">
          <span>Career Match</span>
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
