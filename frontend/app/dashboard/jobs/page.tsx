"use client";

import { useState, useCallback } from "react";
import {
  Briefcase, Search, MapPin, Clock, ExternalLink,
  Loader2, AlertCircle, RefreshCw, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  company_logo_url: string;
}

// ─── Quick-search suggestions ────────────────────────────────────────────────

const QUICK_SEARCHES = [
  "Data Analyst", "React", "Python", "Product Manager",
  "Power BI", "Full Stack", "UX Designer", "DevOps",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [input,        setInput]        = useState("");
  const [query,        setQuery]        = useState("");
  const [jobs,         setJobs]         = useState<RemotiveJob[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  // null = no search done yet, false/true = search done
  const [searched,     setSearched]     = useState(false);

  const fetchJobs = useCallback(async (search: string) => {
    if (!search.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/jobs?search=${encodeURIComponent(search)}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch jobs");
      setJobs(data.jobs ?? []);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setActiveFilter(null);
    setQuery(trimmed);
    fetchJobs(trimmed);
  };

  const handlePillClick = (term: string) => {
    if (activeFilter === term) {
      setActiveFilter(null);
      setInput("");
      setQuery("");
      setJobs([]);
      setSearched(false);
    } else {
      setActiveFilter(term);
      setInput(term);
      setQuery(term);
      fetchJobs(term);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold uppercase tracking-tight">
              Remote Jobs
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Live listings — powered by Remotive
          </p>
        </div>
        {searched && (
          <button
            onClick={() => fetchJobs(query)}
            disabled={loading}
            className="inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-5 py-2.5 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Product Manager, Data Analyst, React…"
              className="w-full border-2 border-foreground pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !input.trim()}
            className="border-2 border-foreground bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
          >
            Search
          </button>
        </div>

        {/* Quick-search pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {QUICK_SEARCHES.map((term) => {
            const isActive = activeFilter === term;
            return (
              <button
                key={term}
                onClick={() => handlePillClick(term)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700"
                }`}
              >
                {term}
                {isActive && <X className="h-3 w-3" />}
              </button>
            );
          })}
          {activeFilter && (
            <button
              onClick={() => handlePillClick(activeFilter)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors ml-1"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Empty state — no search done yet */}
      {!searched && !loading && (
        <div className="flex flex-col items-center gap-4 py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Search className="h-8 w-8 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-foreground">Search for your next remote role</p>
            <p className="text-sm text-muted-foreground mt-1">
              Type a job title, skill, or category above — e.g. <span className="font-semibold text-foreground">"Product Manager"</span> or <span className="font-semibold text-foreground">"Data Analyst"</span>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-muted-foreground">Fetching live jobs for &ldquo;{query}&rdquo;&hellip;</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Could not load jobs</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && searched && (
        <>
          {jobs.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium">
              {jobs.length} remote role{jobs.length !== 1 ? "s" : ""} found for &ldquo;{query}&rdquo;
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  {job.company_logo_url ? (
                    <img
                      src={job.company_logo_url}
                      alt={job.company_name}
                      className="h-10 w-10 rounded-lg object-contain border border-slate-100 bg-white flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg font-bold uppercase tracking-tight leading-tight line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                      {job.company_name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.candidate_required_location || "Worldwide"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(job.publication_date)}
                  </div>
                  {job.job_type && (
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {job.job_type}
                    </span>
                  )}
                  {job.salary && (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {job.salary}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {job.category && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {job.category}
                    </span>
                  )}
                  {job.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>

                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center justify-center gap-2 border-2 border-foreground bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  View & Apply
                </a>
              </div>
            ))}
          </div>

          {jobs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 border-2 border-dashed border-slate-200">
              <Briefcase className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-muted-foreground">No remote jobs found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground">Try a different keyword — e.g. &ldquo;Python&rdquo;, &ldquo;React&rdquo;, &ldquo;Data&rdquo;</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
