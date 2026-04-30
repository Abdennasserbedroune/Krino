"use client";

import React, { useState } from "react";
import { Copy, Check, Loader2, FileText } from "lucide-react";

type Tone = "formal" | "confident" | "creative";

interface CoverLetterGeneratorProps {
  resumeText: string;
  jobDescription: string;
  score?: number;
}

export function CoverLetterGenerator({
  resumeText,
  jobDescription,
  score = 0,
}: CoverLetterGeneratorProps) {
  const [tone, setTone] = useState<Tone>("confident");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const tones: { value: Tone; label: string; emoji: string }[] = [
    { value: "formal", label: "Formal", emoji: "👔" },
    { value: "confident", label: "Confident", emoji: "💪" },
    { value: "creative", label: "Creative", emoji: "✨" },
  ];

  const generate = async () => {
    setLoading(true);
    setError("");
    setCoverLetter("");
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, tone }),
      });
      if (!res.ok) throw new Error("Generation failed. Please try again.");
      const data = await res.json();
      setCoverLetter(data.coverLetter ?? "");
      setExpanded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Cover Letter Generator
        </h3>
        {score >= 6 && (
          <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-full">
            Strong Match ✓
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Generate a tailored cover letter based on your resume and the job description.
      </p>

      {/* Tone selector */}
      <div className="flex gap-2">
        {tones.map((t) => (
          <button
            key={t.value}
            onClick={() => setTone(t.value)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-150 ${
              tone === t.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={loading || !resumeText || !jobDescription}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Cover Letter"
        )}
      </button>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-100 dark:bg-gray-800 rounded"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      )}

      {coverLetter && expanded && (
        <div className="space-y-2">
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={10}
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
          />
          <button
            onClick={copy}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      )}
    </div>
  );
}

export default CoverLetterGenerator;
