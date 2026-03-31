"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface ScoreEntry {
  id: string;
  score: number;
  analyzed_at: string;
  job_title?: string;
}

export function ScoreTimeline() {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("analysis_history")
        .select("id, score, analyzed_at, job_title")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: true })
        .limit(20);

      if (!error && data) setEntries(data as ScoreEntry[]);
      setLoading(false);
    }
    fetchHistory();
  }, [supabase]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-3xl mb-3">📈</p>
        <p className="font-semibold text-gray-700 dark:text-gray-300">
          No score history yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
          Analyze your resume to start tracking how your score improves over time.
        </p>
      </div>
    );
  }

  const maxScore = 10;
  const chartHeight = 80;

  const points = entries.map((e, i) => {
    const x = entries.length === 1 ? 50 : (i / (entries.length - 1)) * 100;
    const y = chartHeight - (e.score / maxScore) * chartHeight;
    return { x, y, entry: e };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const firstScore = entries[0].score;
  const lastScore = entries[entries.length - 1].score;
  const improved = lastScore - firstScore;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Score Timeline
        </h3>
        {entries.length > 1 && (
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              improved > 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                : improved < 0
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {improved > 0 ? "+" : ""}{improved.toFixed(1)} since first analysis
          </span>
        )}
      </div>

      {/* SVG sparkline */}
      <div className="relative">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={(chartHeight * pct) / 100}
              x2="100"
              y2={(chartHeight * pct) / 100}
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-gray-200 dark:text-gray-700"
            />
          ))}
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="#6366f1"
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {entries.map((e, i) => (
          <div
            key={e.id}
            className="flex-shrink-0 text-center"
          >
            <p className="text-xs text-gray-400 dark:text-gray-500">
              v{i + 1}
            </p>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {e.score.toFixed(1)}
            </p>
            {e.job_title && (
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[64px] truncate">
                {e.job_title}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScoreTimeline;
