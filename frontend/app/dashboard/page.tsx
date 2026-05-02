"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Target, MessageSquare, Briefcase } from "lucide-react";
import Protected from "@/components/Protected";

const DesiredJobPage = dynamic(() => import("./desired-job/page"), { ssr: false });
const ChatPage       = dynamic(() => import("./chat/page"),        { ssr: false });
const JobsPage       = dynamic(() => import("./jobs/page"),        { ssr: false });

type TabId = "desired-job" | "chat" | "jobs";

// ─── Design tokens (matching landing page system) ─────────────────────────────
const CARD_SHADOW =
  "0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)";

export default function DashboardIndexPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("desired-job");

  const tabs = [
    { id: "desired-job" as TabId, label: t.careerMatch.title, icon: Target        },
    { id: "chat"        as TabId, label: t.chatPage.title,    icon: MessageSquare  },
    { id: "jobs"        as TabId, label: t.jobs.title,        icon: Briefcase      },
  ];

  return (
    <Protected>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 14px 4px 8px",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(17,24,39,0.09)",
            boxShadow: "0 1px 4px rgba(17,24,39,0.06)",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#3b82f6",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6B7280",
            }}
          >
            Job Seeker · Career Dashboard
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "#111827",
          }}
        >
          {t.careerMatch.subtitle}
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            fontWeight: 300,
            color: "#6B7280",
            lineHeight: 1.7,
            letterSpacing: "0.01em",
            maxWidth: 560,
          }}
        >
          {t.hero.subSeeker}
        </p>
      </div>

      {/* Tab bar — pill style from landing */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 20px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.35px",
                whiteSpace: "nowrap",
                color: active ? "#FFFFFF" : "#6B7280",
                background: active ? "#111827" : "rgba(255,255,255,0.82)",
                backdropFilter: active ? "none" : "blur(8px)",
                boxShadow: active
                  ? "rgba(0,0,0,0.4) 0px 12px 24px -6px, rgba(255,255,255,0.15) 0px 1px 1px 0px inset, rgba(0,0,0,0.5) 0px -2px 3px 0px inset, rgba(0,0,0,0.10) 0px 0px 0px 1px"
                  : "0 1px 4px rgba(17,24,39,0.06), 0 0 0 1px rgba(17,24,39,0.07)",
                transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.color = "#111827";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.color = "#6B7280";
                }
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content card — gradient border shell + 32px radius, matches landing */}
      <div
        style={{
          padding: 1,
          borderRadius: 32,
          background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)",
        }}
        className={activeTab === "jobs" ? "hidden" : ""}
      >
        <div
          style={{
            borderRadius: 31,
            background: "#FFFFFF",
            boxShadow: CARD_SHADOW,
            padding: "32px",
            minHeight: 480,
          }}
        >
          <div className={activeTab !== "desired-job" ? "hidden" : ""}>
            <DesiredJobPage onSwitchToChat={() => setActiveTab("chat")} />
          </div>
          <div className={activeTab !== "chat" ? "hidden" : ""}>
            <ChatPage />
          </div>
        </div>
      </div>

      {/* Jobs: full-width, no card wrapper */}
      <div className={activeTab !== "jobs" ? "hidden" : ""}>
        <JobsPage />
      </div>
    </Protected>
  );
}
