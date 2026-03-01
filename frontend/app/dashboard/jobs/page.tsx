"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase, Search, MapPin, Clock, ExternalLink,
  Loader2, AlertCircle, RefreshCw, X, FileText, Sparkles,
} from "lucide-react";

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

type CvListItem = { id: number; original_filename: string };

// Category-relevant quick-search pills — shown based on detected role
const CATEGORY_PILLS: Record<string, string[]> = {
  "legal":               ["Lawyer", "Legal Counsel", "Compliance", "Paralegal", "Contract Manager"],
  "finance":             ["Financial Analyst", "Accountant", "FP&A", "Controller", "Auditor"],
  "data":                ["Data Analyst", "Data Scientist", "Data Engineer", "Business Intelligence", "Analytics"],
  "software-dev":        ["React Developer", "Backend Engineer", "Full Stack", "TypeScript", "Python Developer"],
  "devops-sysadmin":     ["DevOps", "Kubernetes", "AWS Engineer", "Site Reliability", "Cloud Engineer"],
  "marketing":           ["Digital Marketing", "SEO", "Content Marketing", "Growth", "Brand Manager"],
  "product":             ["Product Manager", "Product Owner", "Agile", "Product Strategy", "Roadmap"],
  "design":              ["UX Designer", "UI Designer", "Figma", "Product Design", "Graphic Designer"],
  "hr":                  ["HR Manager", "Recruiter", "Talent Acquisition", "People Operations", "HRBP"],
  "customer-support":    ["Customer Success", "Support Manager", "Help Desk", "Customer Experience"],
  "business":            ["Sales Manager", "Account Executive", "Business Development", "BDR", "SDR"],
  "writing":             ["Content Writer", "Copywriter", "Technical Writer", "Editor", "SEO Writer"],
  "qa":                  ["QA Engineer", "Test Automation", "SDET", "Manual QA", "Quality Assurance"],
  "education":           ["Teacher", "Trainer", "E-learning", "Curriculum", "Instructional Designer"],
  "management-finance":  ["Project Manager", "Program Manager", "Scrum Master", "Agile Coach", "PMP"],
};

const DEFAULT_PILLS = ["Data Analyst", "React", "Python", "Product Manager", "UX Designer", "DevOps", "Marketing", "Full Stack"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JobsPage() {
  const [cvs,          setCvs]          = useState<CvListItem[]>([]);
  const [loadingCvs,   setLoadingCvs]   = useState(true);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [detectedRole, setDetectedRole] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [inferring,    setInferring]    = useState(false);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [input,        setInput]        = useState("");
  const [query,        setQuery]        = useState("");
  const [usedCategory, setUsedCategory] = useState("");
  const [jobs,         setJobs]         = useState<RemotiveJob[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [searched,     setSearched]     = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingCvs(true);
      try {
        const res  = await fetch("/api/v1/cv/mine", { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as any[];
        const list = (data || []).map(c => ({ id: c.id, original_filename: c.original_filename }));
        setCvs(list);
        if (list.length === 1) setSelectedCvId(list[0].id);
      } catch { setCvs([]); }
      finally { setLoadingCvs(false); }
    })();
  }, []);

  const fetchJobs = useCallback(async (search: string, category: string) => {
    if (!search.trim() && !category.trim()) return;
    setLoading(true); setError(""); setSearched(true);
    setUsedCategory(category);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (search)   params.set("search",   search);
      if (category) params.set("category", category);
      const res  = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch jobs");
      setJobs(data.jobs ?? []);
    } catch (e: any) { setError(e.message ?? "Something went wrong."); setJobs([]); }
    finally { setLoading(false); }
  }, []);

  // When CV selected: infer role from CV then auto-fetch matching jobs
  useEffect(() => {
    if (!selectedCvId) return;
    setDetectedRole(""); setCategorySlug(""); setInferring(true);
    (async () => {
      try {
        const res  = await fetch("/api/v1/cv/suggest-job-query", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_id: selectedCvId }),
        });
        const data = await res.json().catch(() => null);
        const sq   = (data?.suggested_query as string) || "";
        const role = (data?.detected_role  as string) || "";
        const slug = (data?.category_slug  as string) || "";
        if (sq || slug) {
          setDetectedRole(role);
          setCategorySlug(slug);
          setActiveFilter(null);
          setInput(sq);
          setQuery(sq);
          fetchJobs(sq, slug);
        }
      } catch { /* ignore */ }
      finally { setInferring(false); }
    })();
  }, [selectedCvId, fetchJobs]);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setActiveFilter(null);
    setQuery(trimmed);
    // When manually searching, drop the category filter so results are broader
    fetchJobs(trimmed, "");
  };

  const handlePillClick = (term: string) => {
    if (activeFilter === term) {
      setActiveFilter(null); setInput(""); setQuery(""); setJobs([]); setSearched(false);
    } else {
      setActiveFilter(term); setInput(term); setQuery(term);
      // Pills use category context when available
      fetchJobs(term, categorySlug);
    }
  };

  const pills = categorySlug && CATEGORY_PILLS[categorySlug]
    ? CATEGORY_PILLS[categorySlug]
    : DEFAULT_PILLS;

  const jobCountLabel = jobs.length > 0
    ? `${jobs.length} remote role${jobs.length !== 1 ? "s" : ""} found`
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold uppercase tracking-tight">Remote Jobs</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Matched to your CV automatically — refine with keywords or filters.
          </p>
        </div>
        {searched && (
          <button onClick={() => fetchJobs(query, usedCategory)} disabled={loading}
            className="inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-5 py-2.5 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        )}
      </div>

      {/* CV selector */}
      {loadingCvs ? (
        <div className="flex items-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Loading your CVs…</p>
        </div>
      ) : cvs.length === 0 ? (
        <div className="border-2 border-dashed border-foreground bg-background/50 p-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-foreground bg-secondary">
            <FileText className="h-8 w-8 text-foreground" />
          </div>
          <p className="font-serif text-xl font-bold uppercase tracking-tight mb-2">No CV uploaded yet</p>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Upload a CV first — then come back here to get matched jobs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Choose which CV to use</label>
          <select
            value={selectedCvId ?? ""}
            onChange={e => setSelectedCvId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a CV…</option>
            {cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.original_filename}</option>)}
          </select>

          {/* Detected role badge */}
          {inferring && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your CV to detect your field…
            </div>
          )}
          {!inferring && detectedRole && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3 w-3" /> Detected role: {detectedRole}
              </span>
              <span className="text-xs text-muted-foreground">Showing {categorySlug} jobs</span>
            </div>
          )}
          {!inferring && selectedCvId && !detectedRole && (
            <p className="text-xs text-muted-foreground">Could not auto-detect your role — use the search bar below.</p>
          )}
        </div>
      )}

      {/* Search + pills */}
      {selectedCvId && cvs.length > 0 && (
        <>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Refine search… e.g. Senior Lawyer, Data Engineer, React"
                  className="w-full border-2 border-foreground pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleSearch} disabled={loading || !input.trim()}
                className="border-2 border-foreground bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40">
                Search
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {pills.map(term => {
                const isActive = activeFilter === term;
                return (
                  <button key={term} onClick={() => handlePillClick(term)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700"
                    }`}>
                    {term}{isActive && <X className="h-3 w-3" />}
                  </button>
                );
              })}
              {activeFilter && (
                <button onClick={() => handlePillClick(activeFilter)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors ml-1">
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {/* States */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-muted-foreground">Fetching live jobs{query ? ` for “${query}”` : ``}…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Could not load jobs</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && searched && (
            <>
              {jobCountLabel && (
                <p className="text-xs text-muted-foreground font-medium">
                  {jobCountLabel}{query ? ` for “${query}”` : ``}
                  {usedCategory ? ` · category: ${usedCategory}` : ``}
                  {" "}·{" "}
                  <a href="https://remotive.com" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground">powered by Remotive</a>
                </p>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                {jobs.map(job => (
                  <div key={job.id}
                    className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-4">

                    <div className="flex items-start gap-3">
                      {job.company_logo_url ? (
                        <img src={job.company_logo_url} alt={job.company_name}
                          className="h-10 w-10 rounded-lg object-contain border border-slate-100 bg-white flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
                        <MapPin className="h-3.5 w-3.5" />{job.candidate_required_location || "Worldwide"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />{timeAgo(job.publication_date)}
                      </div>
                      {job.job_type && (
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{job.job_type}</span>
                      )}
                      {job.salary && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{job.salary}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.category && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{job.category}</span>
                      )}
                      {(job.tags || []).slice(0, 4).map(tag => (
                        <span key={tag} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500">{tag}</span>
                      ))}
                    </div>

                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center justify-center gap-2 border-2 border-foreground bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                      <ExternalLink className="h-4 w-4" /> View on Remotive
                    </a>
                  </div>
                ))}
              </div>

              {jobs.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 border-2 border-dashed border-slate-200">
                  <Briefcase className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-muted-foreground">No remote jobs found{query ? ` for “${query}”` : ``}</p>
                  <p className="text-xs text-muted-foreground">Try a broader keyword or a different search term.</p>
                </div>
              )}
            </>
          )}

          {!loading && !error && !searched && (
            <div className="flex flex-col items-center gap-3 py-16 border-2 border-dashed border-slate-200">
              <Briefcase className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-muted-foreground">Select a CV to get job suggestions</p>
              <p className="text-xs text-muted-foreground">Jobs will be matched to your field automatically.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
