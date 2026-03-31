"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Target, MessageSquare, Briefcase } from "lucide-react";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Protected from "@/components/Protected";

const DesiredJobPage = dynamic(() => import("./desired-job/page"), { ssr: false });
const ChatPage       = dynamic(() => import("./chat/page"),        { ssr: false });
const JobsPage       = dynamic(() => import("./jobs/page"),        { ssr: false });

type TabId = "desired-job" | "chat" | "jobs";

export default function DashboardIndexPage() {
  const { email } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("desired-job");

  const tabs = [
    { id: "desired-job" as TabId, label: t.careerMatch.title, icon: Target        },
    { id: "chat"        as TabId, label: t.chatPage.title,     icon: MessageSquare },
    { id: "jobs"        as TabId, label: t.jobs.title,         icon: Briefcase     },
  ];

  return (
    <Protected>
      {/* Page background — theme-aware, no hardcoded light gradient */}
      <div className="min-h-screen bg-background font-sans text-foreground overflow-x-hidden">

        {/* Header — deep navy gradient that looks great in both modes */}
        <header className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#1a2744]/95 via-[#1e3a6e]/95 to-[#1a2e5a]/95 backdrop-blur-xl border-b border-white/8 shadow-lg">
          <div className="container mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-3">

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white select-none cursor-default">
                Pathwise
              </span>
              <span className="hidden md:inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 whitespace-nowrap">
                {t.hero.roleSeeker}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <LanguageSwitcher />
              {email && (
                <span className="hidden sm:inline-block max-w-[140px] lg:max-w-[220px] truncate text-sm font-medium text-blue-100/80">
                  {email}
                </span>
              )}
              <ProfileDropdown />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 sm:px-6 pt-24 md:pt-40 pb-16 md:pb-24">

          <div className="mb-8 md:mb-12">
            {/* Dashboard badge — theme-aware */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
              {t.nav.dashboard}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl text-foreground mb-3 md:mb-4 tracking-tight leading-tight">
              {t.careerMatch.subtitle}
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl">
              {t.hero.subSeeker}
            </p>
          </div>

          {/* Tab bar — theme-aware inactive state */}
          <div className="mb-6 md:mb-10 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 sm:gap-3 w-max sm:w-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap transition-all ${
                    activeTab === id
                      ? "bg-seeker text-white shadow-lg shadow-seeker/40"
                      : "bg-card text-muted-foreground hover:bg-surface-elevated hover:text-foreground border border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Main card — proper depth in both modes */}
          <div className={`bg-card rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[var(--shadow-soft)] border border-border min-h-[400px] sm:min-h-[560px] ${
            activeTab === "jobs" ? "hidden" : ""
          }`}>
            <div className="p-4 sm:p-8 md:p-12">
              <div className={activeTab !== "desired-job" ? "hidden" : ""}>
                <DesiredJobPage onSwitchToChat={() => setActiveTab("chat")} />
              </div>
              <div className={activeTab !== "chat" ? "hidden" : ""}>
                <ChatPage />
              </div>
            </div>
          </div>

          <div className={activeTab !== "jobs" ? "hidden" : "pt-2"}>
            <JobsPage />
          </div>
        </div>
      </div>
    </Protected>
  );
}
