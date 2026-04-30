"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from "lucide-react";

type StepKey = "upload" | "paste_jd" | "analyze" | "coach";

interface Step {
  key: StepKey;
  label: string;
  description: string;
  emoji: string;
}

const STEPS: Step[] = [
  {
    key: "upload",
    label: "Upload Your Resume",
    description: "Upload a PDF or paste your resume text",
    emoji: "📄",
  },
  {
    key: "paste_jd",
    label: "Paste Job Description",
    description: "Add the job posting you're applying to",
    emoji: "📋",
  },
  {
    key: "analyze",
    label: "Run Your Analysis",
    description: "Get your ATS score and keyword insights",
    emoji: "🔍",
  },
  {
    key: "coach",
    label: "Chat with Your AI Coach",
    description: "Get personalized advice to improve your resume",
    emoji: "🤖",
  },
];

const STORAGE_KEY = "pathwise_onboarding";

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.dismissed) { setDismissed(true); return; }
        setCompleted(new Set(parsed.completed ?? []));
      }
    } catch {}
  }, []);

  const persist = (next: Set<StepKey>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ completed: Array.from(next), dismissed: false })
      );
    } catch {}
  };

  const markComplete = (key: StepKey) => {
    const next = new Set(completed);
    next.add(key);
    setCompleted(next);
    persist(next);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, completed: [] }));
    } catch {}
  };

  if (!mounted || dismissed) return null;

  const completedCount = completed.size;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm">
              {allDone ? "🎉 You're all set!" : "Get Started with Pathwise"}
            </p>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {completedCount}/{totalCount}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {STEPS.map((step) => {
            const done = completed.has(step.key);
            return (
              <button
                key={step.key}
                onClick={() => markComplete(step.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                  done
                    ? "bg-white/60 dark:bg-indigo-900/40 opacity-70"
                    : "bg-white dark:bg-indigo-900/60 hover:bg-white/80 dark:hover:bg-indigo-900/80"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      done
                        ? "line-through text-indigo-400 dark:text-indigo-500"
                        : "text-indigo-900 dark:text-indigo-100"
                    }`}
                  >
                    {step.emoji} {step.label}
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OnboardingChecklist;
