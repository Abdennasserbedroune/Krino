"use client";

import React from "react";

interface KeywordGapDiffProps {
  jobKeywords: string[];
  resumeKeywords: string[];
}

function classifyKeywords(
  jobKeywords: string[],
  resumeKeywords: string[]
) {
  const resumeSet = new Set(
    resumeKeywords.map((k) => k.toLowerCase().trim())
  );

  const present: string[] = [];
  const missing: string[] = [];

  jobKeywords.forEach((kw) => {
    if (resumeSet.has(kw.toLowerCase().trim())) {
      present.push(kw);
    } else {
      missing.push(kw);
    }
  });

  return { present, missing };
}

export function KeywordGapDiff({ jobKeywords, resumeKeywords }: KeywordGapDiffProps) {
  const { present, missing } = classifyKeywords(jobKeywords, resumeKeywords);
  const critical = missing.slice(0, 5);
  const niceToHave = missing.slice(5);

  const matchPercent =
    jobKeywords.length > 0
      ? Math.round((present.length / jobKeywords.length) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Keyword Gap Analysis
        </h3>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${
            matchPercent >= 70
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : matchPercent >= 40
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
          }`}
        >
          {matchPercent}% Match
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            matchPercent >= 70
              ? "bg-emerald-500"
              : matchPercent >= 40
              ? "bg-yellow-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${matchPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Present keywords */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>✅</span> Found in Your Resume ({present.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {present.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                No matching keywords found
              </span>
            ) : (
              present.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 transition-all duration-200 hover:scale-105"
                >
                  {kw}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Missing keywords */}
        <div className="space-y-3">
          {critical.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>🚨</span> Critical Missing ({critical.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {critical.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 transition-all duration-200 hover:scale-105"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {niceToHave.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-500 dark:text-orange-400 flex items-center gap-1">
                <span>⚠️</span> Nice to Have ({niceToHave.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {niceToHave.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-1 text-xs rounded-md bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 transition-all duration-200 hover:scale-105"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missing.length === 0 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              🎉 All keywords from the JD are in your resume!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default KeywordGapDiff;
