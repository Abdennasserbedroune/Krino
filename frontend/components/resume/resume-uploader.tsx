"use client";

import { useCallback, useRef, useState } from "react";

type Metric = { key: string; label: string; value: number; details?: string };
type FeedbackItem = { severity: "low" | "medium" | "high" | "critical"; message: string; recommendation?: string };
type AnalyzeResponse = {
  overall_score: number;
  metrics: { coverage: Metric; length: Metric; contact: Metric; skills: Metric };
  sections: { summary: boolean; experience: boolean; education: boolean; projects: boolean; skills: boolean; certifications?: boolean };
  contact: { has_email: boolean; has_phone: boolean; email_count: number; phone_count: number };
  detected_skills: string[];
  word_count: number;
  sentence_count: number;
  truncated: boolean;
  feedback: FeedbackItem[];
};

export function ResumeUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const onBrowse = () => inputRef.current?.click();

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await handleFile(files[0]);
  }, []);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
  };

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);

    const allowed = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const nameLower = file.name.toLowerCase();
    const isAllowed =
      allowed.includes(file.type) ||
      nameLower.endsWith(".pdf") ||
      nameLower.endsWith(".txt") ||
      nameLower.endsWith(".docx");

    if (!isAllowed) {
      setError("Unsupported file type. Please upload PDF, DOCX, or TXT.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    if (jobDescription.trim()) form.append("jobDescription", jobDescription.trim());

    setUploading(true);
    try {
      const res = await fetch("/api/analyze/resume", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to analyze resume.");
      }
      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section aria-labelledby="resume-upload-title" className="space-y-4">
      <header className="space-y-1">
        <h2 id="resume-upload-title" className="text-xl font-semibold text-[var(--foreground)]">Upload your résumé</h2>
        <p className="text-sm text-[var(--muted)]">PDF and TXT supported. DOCX extraction is also supported. We’ll analyze key signals and suggest improvements.</p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border border-[var(--border)] p-6 transition ${
          dragging ? "outline outline-2 outline-[var(--brand)]" : ""
        }`}
        role="region"
        aria-label="File dropzone"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 5 17 10" />
              <line x1="12" y1="5" x2="12" y2="21" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Drag and drop your file here, or{" "}
            <button
              type="button"
              onClick={onBrowse}
              className="font-semibold text-[var(--brand)] underline underline-offset-4"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-[var(--muted-2)]">Accepted: PDF, DOCX, TXT • Max 100k characters analyzed</p>
          <input
            ref={inputRef}
            type="file"
            onChange={onSelect}
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_3fr]">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <label htmlFor="jd" className="block text-sm font-medium text-[var(--foreground)]">
            Optional job description
          </label>
          <textarea
            id="jd"
            rows={5}
            placeholder="Paste a job description to improve skills detection…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted)]">
              {fileName ? `Selected: ${fileName}` : "No file selected"}
            </div>
            <button
              type="button"
              onClick={onBrowse}
              disabled={isUploading}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand-contrast)] transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploading ? "Analyzing…" : "Choose file"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-[var(--foreground)]" role="status" aria-live="polite">{error}</p>
          )}

          {result && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-[var(--border)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted-2)]">Overall score</p>
                <p className="text-3xl font-semibold text-[var(--brand)]">{result.overall_score}</p>
                <p className="mt-1 text-xs text-[var(--muted-2)]">
                  {result.word_count} words • {result.sentence_count} sentences {result.truncated ? "(truncated)" : ""}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.values(result.metrics).map((m) => (
                  <div key={m.key} className="rounded-md border border-[var(--border)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--muted-2)]">{m.label}</p>
                    <p className="text-xl font-semibold text-[var(--foreground)]">{m.value}</p>
                    {m.details && <p className="mt-1 text-xs text-[var(--muted)]">{m.details}</p>}
                  </div>
                ))}
              </div>

              {result.detected_skills.length > 0 && (
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-2)]">Detected skills</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {result.detected_skills.map((s) => (
                      <li key={s} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.feedback.length > 0 && (
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-2)]">Feedback</p>
                  <ul className="mt-2 space-y-2">
                    {result.feedback.map((f, i) => {
                      const sevColor =
                        f.severity === "high" || f.severity === "critical"
                          ? "text-[var(--brand)]"
                          : "text-[var(--muted)]";
                      return (
                        <li key={i} className="text-sm">
                          <span className={`font-semibold ${sevColor}`}>{f.severity.toUpperCase()}</span>{" "}
                          <span className="text-[var(--foreground)]">{f.message}</span>
                          {f.recommendation && (
                            <span className="block text-xs text-[var(--muted)]">{f.recommendation}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
