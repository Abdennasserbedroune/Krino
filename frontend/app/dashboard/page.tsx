"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth/client";
import { Upload, BarChart3, MessageSquare, Briefcase } from "lucide-react";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import Protected from "@/components/Protected";

// Dynamically import page components
const UploadPage = dynamic(() => import("./upload/page"), { ssr: false });
const AnalysisPage = dynamic(() => import("./analysis/page"), { ssr: false });
const ChatPage = dynamic(() => import("./chat/page"), { ssr: false });
const JobsPage = dynamic(() => import("./jobs/page"), { ssr: false });

type TabId = "upload" | "analysis" | "chat" | "jobs";

export default function DashboardIndexPage() {
  const { user, email } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const router = useRouter();

  const tabs = [
    { id: "upload" as TabId, label: "Upload CV", icon: Upload },
    { id: "analysis" as TabId, label: "Score & CV Report", icon: BarChart3 },
    { id: "chat" as TabId, label: "Chat with AI", icon: MessageSquare },
    { id: "jobs" as TabId, label: "Jobs", icon: Briefcase },
  ];

  return (
    <Protected>
      <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-background to-background font-sans text-foreground overflow-x-hidden">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-seeker/95 via-blue-600/95 to-blue-700/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white"
              >
                Pathwise
              </Link>
              <span className="hidden md:inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50">
                Job Seeker Workspace
              </span>
            </div>
            <div className="flex items-center gap-4">
              {email && (
                <span className="hidden sm:inline-block text-sm font-medium text-blue-50/90">
                  {email}
                </span>
              )}
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 pt-40 pb-24">
          {/* Page Header */}
          <div className="mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Dashboard
            </div>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-4 tracking-tight">
              Your CV, but job-ready.
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Upload your resume, see your score and report, then chat with an AI career coach
              to get it ready for your next role.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-10 flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold transition-all ${isActive
                    ? "bg-seeker text-white shadow-lg shadow-seeker/40"
                    : "bg-white/90 text-slate-600 hover:bg-blue-50 hover:text-blue-900 border border-border/60"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "jobs" ? (
            // Jobs: use full-width layout without inner rounded card
            <div className="pt-2">
              <JobsPage />
            </div>
          ) : (
            <div className="bg-card/95 rounded-[2.5rem] shadow-craft border border-border/40 min-h-[560px]">
              <div className="p-8 md:p-12">
                {activeTab === "upload" && <UploadPage />}
                {activeTab === "analysis" && <AnalysisPage />}
                {activeTab === "chat" && <ChatPage />}
              </div>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}
