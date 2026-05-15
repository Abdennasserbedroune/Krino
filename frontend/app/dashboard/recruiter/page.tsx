"use client";

import { useState, useRef } from "react";
import {
    Users,
    BarChart3,
    SlidersHorizontal,
    Upload,
    CheckCircle2,
    FileText,
    Sparkles,
    Star,
    AlertTriangle,
    ThumbsUp,
    ThumbsDown,
    Minus,
    MessageCircle,
    ShieldAlert,
    Trophy,
    Target,
    Zap,
    Copy,
    Check,
    X,
    Trash2,
    RefreshCw,
    ClipboardList,
    Download,
    NotebookPen,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import Protected from "@/components/Protected";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "candidates" | "analytics";
type MatchStep = 1 | 2 | 3;

interface MatchReason {
    overall_reason: string;
    strengths: string[];
    risks: string[];
}

interface MatchResult {
    cv_id: number;
    file_name: string;
    match_score: number;
    skills_match_score: number;
    experience_score: number;
    cv_quality_score: number;
    reasons: MatchReason;
}

interface SelectedCv {
    id: number;
    original_filename: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verdictFromScore(score: number): {
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    cls: string;
    bar: string;
} {
    if (score >= 80) return {
        label: "Strong Hire",
        sublabel: "This candidate is an excellent match for the role.",
        icon: <Trophy className="h-6 w-6" />,
        cls: "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300",
        bar: "bg-emerald-500",
    };
    if (score >= 65) return {
        label: "Recommended",
        sublabel: "Good profile — worth a first interview.",
        icon: <ThumbsUp className="h-6 w-6" />,
        cls: "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300",
        bar: "bg-blue-500",
    };
    if (score >= 45) return {
        label: "Borderline",
        sublabel: "Some gaps to probe — keep as backup.",
        icon: <Minus className="h-6 w-6" />,
        cls: "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300",
        bar: "bg-amber-500",
    };
    return {
        label: "Not Recommended",
        sublabel: "Profile doesn't meet the core requirements.",
        icon: <ThumbsDown className="h-6 w-6" />,
        cls: "bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300",
        bar: "bg-red-500",
    };
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
    const r = 26;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <div className="flex flex-col items-center gap-1.5">
            <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                    cx="34" cy="34" r={r}
                    fill="none"
                    strokeWidth="6"
                    stroke={color}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    transform="rotate(-90 34 34)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
                <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" className="fill-foreground">
                    {value}
                </text>
            </svg>
            <span className="text-[11px] font-semibold text-center leading-tight max-w-[64px]" style={{ color: "var(--text-body)" }}>{label}</span>
        </div>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="ml-auto flex-shrink-0 rounded-lg p-1.5 transition"
            style={{ color: "var(--text-faint)" }}
            title="Copy question"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

function CopyAllQuestionsButton({ questions }: { questions: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(questions).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all"
            style={{
                borderColor: copied ? "rgba(34,197,94,0.4)" : "var(--border)",
                background: copied ? "rgba(34,197,94,0.08)" : "var(--surface)",
                color: copied ? "#16a34a" : "var(--text-body)",
            }}
            title="Copy all interview questions as Markdown"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied to clipboard!
                </>
            ) : (
                <>
                    <ClipboardList className="h-3.5 w-3.5" />
                    Copy All as Markdown
                </>
            )}
        </button>
    );
}

function buildAllQuestionsMarkdown(jobDomain: string, strengths: string[], risks: string[]): string {
    const general = [
        `Walk me through your most relevant experience for this ${jobDomain} role and why it fits.`,
        `What would your first 90 days look like if you joined us in this position?`,
        `How do you stay current in ${jobDomain}? Any recent learning or projects?`,
    ];
    const strengthQs = strengths.map((s) => `Your profile shows strength in "${s}" — can you walk me through a specific project or situation where this made a real impact?`);
    const riskQs = risks.map((r) => `I noticed "${r}" in the profile. How do you approach this in your day-to-day work, and how have you improved in this area?`);
    const lines: string[] = ["## Interview Questions\n", "### General Fit\n"];
    general.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    if (strengthQs.length > 0) { lines.push("\n### Explore Strengths\n"); strengthQs.forEach((q, i) => lines.push(`${i + 1}. ${q}`)); }
    if (riskQs.length > 0) { lines.push("\n### Probe Gaps\n"); riskQs.forEach((q, i) => lines.push(`${i + 1}. ${q}`)); }
    return lines.join("\n");
}

function exportResultsToCSV(results: MatchResult[]) {
    const headers = ["File Name", "Overall Score", "Skills Score", "Experience Score", "CV Quality Score", "Verdict", "Strengths", "Risks"];
    const rows = [...results].sort((a, b) => b.match_score - a.match_score).map((r) => {
        const verdict = verdictFromScore(r.match_score).label;
        const strengths = (r.reasons.strengths ?? []).join(" | ");
        const risks = (r.reasons.risks ?? []).join(" | ");
        return [
            `"${r.file_name.replace(/"/g, '""')}"`,
            r.match_score, r.skills_match_score, r.experience_score, r.cv_quality_score,
            `"${verdict}"`, `"${strengths.replace(/"/g, '""')}"`, `"${risks.replace(/"/g, '""')}"`,
        ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `krino-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ResultSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="rounded-2xl border px-6 py-5 flex items-start gap-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="h-10 w-10 rounded-full skeleton flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-3 w-24 rounded-full skeleton" />
                    <div className="h-4 w-48 rounded-full skeleton" />
                    <div className="h-3 w-full rounded-full skeleton" />
                    <div className="h-3 w-4/5 rounded-full skeleton" />
                </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="mb-6 h-5 w-36 rounded-full skeleton" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-[68px] w-[68px] rounded-full skeleton" />
                            <div className="h-3 w-14 rounded-full skeleton" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Section card — replaces rounded-3xl bg-card/80 everywhere ───────────────
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl border ${className}`}
            style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
        >
            {children}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterDashboardPage() {
    const { accessToken } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabId>("candidates");

    const tabs = [
        { id: "candidates" as TabId, label: t.ext.tabCandidates, icon: Users },
        { id: "analytics"  as TabId, label: t.ext.tabAnalytics,  icon: BarChart3 },
    ];

    return (
        <Protected>
            {/* ── Page header — same pattern as all seeker pages ── */}
            <div style={{ marginBottom: 32 }}>
                <div className="page-overline-badge">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--recruiter)", display: "inline-block", flexShrink: 0 }} />
                    <span>Recruiter · Talent Match</span>
                </div>
                <h1 className="page-h1">{t.ext.talentMgmt}</h1>
                <p className="page-subtitle">{t.ext.talentMgmtSub}</p>
            </div>

            {/* ── Tab switcher ── */}
            <div className="flex flex-wrap gap-3 mb-8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                            style={{
                                background: isActive ? "var(--recruiter)" : "var(--surface)",
                                color: isActive ? "#fff" : "var(--text-body)",
                                border: `1px solid ${isActive ? "var(--recruiter)" : "var(--border)"}`,
                                boxShadow: isActive ? "var(--shadow-soft)" : "none",
                            }}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab content wrapped in page-card-shell ── */}
            <div className="page-card-shell">
                <div className="page-card-inner">
                    <RecruiterMatchFlow accessToken={accessToken ?? null} activeTab={activeTab} />
                </div>
            </div>
        </Protected>
    );
}

// ─── RecruiterMatchFlow ───────────────────────────────────────────────────────

function RecruiterMatchFlow({ accessToken, activeTab }: { accessToken: string | null; activeTab: TabId }) {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [step, setStep] = useState<MatchStep>(1);
    const [jobDomain, setJobDomain] = useState("AI & Data");
    const [experienceRange, setExperienceRange] = useState("");
    const [salaryRange, setSalaryRange] = useState("");
    const [location, setLocation] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [skills, setSkills] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [selectedCvs, setSelectedCvs] = useState<SelectedCv[]>([]);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([]);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [candidateNotes, setCandidateNotes] = useState<Record<number, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const backendBaseUrl = "";

    const steps: { id: MatchStep; label: string }[] = [
        { id: 1, label: t.ext.theJob },
        { id: 2, label: t.ext.yourCv },
        { id: 3, label: t.ext.yourResult },
    ];

    const canContinueFromStep1 = Boolean(jobDomain && experienceRange && salaryRange);
    const canRunMatching = selectedCvs.length > 0 && !isRunning;

    // ─── UPLOAD ───────────────────────────────────────────────────────────────
    const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []) as File[];
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!selectedFiles.length || !accessToken) return;
        const remainingSlots = 5 - selectedCvs.length;
        if (remainingSlots <= 0) {
            toast({ variant: "destructive", title: "Limit reached", description: "You can only attach up to 5 CVs." });
            return;
        }
        const filesToProcess = selectedFiles.slice(0, remainingSlots);
        setUploading(true);
        setUploadingFileNames(filesToProcess.map((f) => f.name));
        const successfulThisBatch: SelectedCv[] = [];
        try {
            for (const file of filesToProcess) {
                const formData = new FormData();
                formData.append("file", file);
                let res: Response;
                try {
                    res = await fetch(`${backendBaseUrl}/api/v1/cv/upload`, { method: "POST", credentials: "include", body: formData });
                } catch {
                    throw new Error(`Network error while uploading "${file.name}". Check your connection.`);
                }
                if (res.status === 409) {
                    const existingRes = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, { credentials: "include" });
                    if (existingRes.ok) {
                        const list = (await existingRes.json()) as { id: number; original_filename: string }[];
                        const match = list.find((cv) => cv.original_filename === file.name);
                        if (match) {
                            const alreadyAdded = selectedCvs.some((c) => c.id === match.id) || successfulThisBatch.some((c) => c.id === match.id);
                            if (!alreadyAdded) successfulThisBatch.push(match);
                            continue;
                        }
                    }
                    const d = await res.json().catch(() => null);
                    throw new Error((d as any)?.detail ?? `"${file.name}" already exists but could not be resolved.`);
                }
                if (!res.ok) {
                    const d = await res.json().catch(() => null);
                    throw new Error((d as any)?.detail ?? `Failed to upload "${file.name}".`);
                }
                const created = (await res.json()) as { id: number; original_filename: string };
                const alreadyAdded = selectedCvs.some((c) => c.id === created.id) || successfulThisBatch.some((c) => c.id === created.id);
                if (!alreadyAdded) successfulThisBatch.push(created);
            }
            if (successfulThisBatch.length > 0) setSelectedCvs((prev) => [...prev, ...successfulThisBatch].slice(0, 5));
        } catch (err: any) {
            if (successfulThisBatch.length > 0) setSelectedCvs((prev) => [...prev, ...successfulThisBatch].slice(0, 5));
            toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Something went wrong." });
        } finally {
            setUploading(false);
            setUploadingFileNames([]);
        }
    };

    const handleRemoveFile = (index: number) => setSelectedCvs((prev) => prev.filter((_, i) => i !== index));
    const handleClearAll = () => { setSelectedCvs([]); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleRunMatching = async () => {
        if (!selectedCvs.length || !accessToken) return;
        setIsRunning(true); setResults([]); setMatchError(null); setStep(3);
        try {
            const payload = {
                job: { domain: jobDomain, experience_range: experienceRange, salary_range: salaryRange, location, contract_type: employmentType, skills_text: skills, job_description: jobDescription || undefined },
                cv_ids: selectedCvs.map((cv) => cv.id),
            };
            const res = await fetch(`${backendBaseUrl}/api/v1/recruiter/match-cvs`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d as any)?.detail ?? "Matching failed"); }
            const data = (await res.json()) as { results: MatchResult[] };
            setResults(data.results || []);
        } catch (err: any) {
            const msg = err?.message ?? "Could not run AI matching.";
            setMatchError(msg);
            toast({ variant: "destructive", title: "Matching failed", description: msg });
            setStep(2);
        } finally {
            setIsRunning(false);
        }
    };

    const handleRetry = () => { setMatchError(null); handleRunMatching(); };
    const handleRemoveFromResults = (cvId: number) => { setResults((prev) => prev.filter((r) => r.cv_id !== cvId)); setSelectedCvs((prev) => prev.filter((cv) => cv.id !== cvId)); setFocusedIndex(0); };
    const handleReset = () => { setStep(1); setSelectedCvs([]); setResults([]); setMatchError(null); setFocusedIndex(0); setCandidateNotes({}); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const hasResults = results.length > 0;
    const safeIndex = Math.min(focusedIndex, Math.max(results.length - 1, 0));
    const focusedResult = hasResults ? results[safeIndex] : null;

    // shared input class
    const inputCls = "w-full h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition";
    const inputStyle = { borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" };

    // ─── ANALYTICS TAB ───────────────────────────────────────────────────────
    if (activeTab === "analytics") {
        return (
            <div className="space-y-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--recruiter)" }}>{t.ext.tabAnalytics}</p>
                    <h2 className="page-h1 text-2xl md:text-3xl">{t.ext.compareDepth}</h2>
                    <p className="page-subtitle">{t.ext.selectCvCompare}</p>
                </div>

                {!hasResults && (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-body)" }}>
                        Run a match in the Candidates tab first to see analytics here.
                    </div>
                )}

                {hasResults && focusedResult && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => (
                                <button key={r.cv_id} onClick={() => setFocusedIndex(idx)}
                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                                    style={{
                                        borderColor: idx === safeIndex ? "var(--recruiter)" : "var(--border)",
                                        background: idx === safeIndex ? "var(--recruiter)" : "var(--surface)",
                                        color: idx === safeIndex ? "#fff" : "var(--text-primary)",
                                    }}>
                                    <span className="truncate max-w-[140px] md:max-w-[220px]">{r.file_name}</span>
                                    <span className="opacity-80">{r.match_score}/100</span>
                                </button>
                            ))}
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                            <SectionCard className="p-6 md:p-8 space-y-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.matchMetrics}</h3>
                                        <p className="mt-1 text-xs" style={{ color: "var(--text-body)" }}>{t.ext.metricsSub}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-bold" style={{ color: "var(--recruiter)" }}>{focusedResult.match_score}</div>
                                        <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>/ 100</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: t.ext.domainFit,     value: focusedResult.match_score },
                                        { label: t.ext.skillsHeading, value: focusedResult.skills_match_score },
                                        { label: t.ext.expHeading,    value: focusedResult.experience_score },
                                        { label: t.ext.quality,       value: focusedResult.cv_quality_score },
                                    ].map((m) => (
                                        <div key={m.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                                <span>{m.label}</span><span>{m.value}/100</span>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, m.value))}%`, background: "var(--recruiter)" }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                            <SectionCard className="p-6 md:p-8 space-y-4">
                                <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.fitExplanation}</h3>
                                <p className="text-sm" style={{ color: "var(--text-body)" }}>{focusedResult.reasons.overall_reason}</p>
                                {focusedResult.reasons.strengths?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wide mb-1 text-emerald-600">{t.ext.exploreStrengths}</h4>
                                        <ul className="list-disc pl-5 text-xs text-emerald-600 space-y-1">
                                            {focusedResult.reasons.strengths.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {focusedResult.reasons.risks?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wide mb-1 text-amber-600">{t.ext.probeGaps}</h4>
                                        <ul className="list-disc pl-5 text-xs text-amber-600 space-y-1">
                                            {focusedResult.reasons.risks.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </SectionCard>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ─── CANDIDATES TAB ───────────────────────────────────────────────────────
    return (
        <div className="space-y-8">
            {/* Step indicators */}
            <div className="grid gap-4 md:grid-cols-3">
                {steps.map((item) => {
                    const isActive = step === item.id;
                    const isCompleted = step > item.id;
                    return (
                        <div key={item.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                            style={{
                                borderColor: isActive ? "var(--recruiter)" : "var(--border)",
                                background: isActive ? "var(--recruiter-soft)" : "var(--surface)",
                            }}>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                                style={{
                                    background: isActive ? "var(--recruiter)" : isCompleted ? "#22c55e" : "var(--muted)",
                                    color: isActive || isCompleted ? "#fff" : "var(--text-body)",
                                }}>
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : item.id}
                            </div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
                    <SectionCard className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5" style={{ color: "var(--recruiter)" }} />
                            <h3 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.defineRoleTitle}</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.jobDomainLabel}</label>
                                <select value={jobDomain} onChange={(e) => setJobDomain(e.target.value)} className={inputCls} style={inputStyle}>
                                    <option>AI &amp; Data</option>
                                    <option>Software Engineering</option>
                                    <option>Product Management</option>
                                    <option>Marketing &amp; Growth</option>
                                    <option>Finance &amp; Banking</option>
                                    <option>Design &amp; UX</option>
                                </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.expRangeLabel}</label>
                                    <select value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)} className={inputCls} style={inputStyle}>
                                        <option value="">{t.ext.selectExp}</option>
                                        <option>0-1 years</option><option>2-4 years</option><option>5-7 years</option><option>8+ years</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.salaryRangeLabel}</label>
                                    <select value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} className={inputCls} style={inputStyle}>
                                        <option value="">{t.ext.selectSalary}</option>
                                        <option>$40k - $60k</option><option>$60k - $90k</option><option>$90k - $120k</option><option>$120k+</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.locationLabel}</label>
                                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.ext.locationPlaceholder} className={inputCls} style={inputStyle} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.contractTypeLabel}</label>
                                    <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputCls} style={inputStyle}>
                                        <option value="">{t.ext.selectType}</option>
                                        <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{t.ext.keySkillsNotesLabel}</label>
                                <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={3}
                                    placeholder={t.ext.keySkillsNotesPlaceholder}
                                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition"
                                    style={{ ...inputStyle, borderColor: "var(--border)" }} />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium" style={{ color: "var(--text-body)" }}>Job Description</label>
                                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--recruiter-soft)", color: "var(--recruiter)" }}>Recommended</span>
                                </div>
                                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={5}
                                    placeholder="Paste the full job description here — the AI will use it for precise matching..."
                                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition resize-none"
                                    style={{ ...inputStyle, borderColor: "var(--border)" }} />
                                <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>Including the full JD gives the AI richer context and produces more accurate match scores.</p>
                            </div>
                        </div>
                        <button disabled={!canContinueFromStep1} onClick={() => setStep(2)}
                            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: "var(--recruiter)", boxShadow: "var(--shadow-cta)" }}>
                            {t.ext.continueToCvs}
                        </button>
                    </SectionCard>

                    {/* Role summary panel */}
                    <SectionCard className="p-6 md:p-8 space-y-4" style={{ borderStyle: "dashed" } as any}>
                        <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.roleSummaryTitle}</h3>
                        <p className="text-sm" style={{ color: "var(--text-body)" }}>{t.ext.roleSummarySub}</p>
                        <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-body)" }}>
                            <li><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summaryDomain}</span> {jobDomain}</li>
                            <li><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summaryExp}</span> {experienceRange || t.ext.notSetYet}</li>
                            <li><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summarySalary}</span> {salaryRange || t.ext.notSetYet}</li>
                            <li><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summaryLocation}</span> {location || t.ext.notSetYet}</li>
                            <li><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summaryContract}</span> {employmentType || t.ext.notSetYet}</li>
                        </ul>
                        {skills && <p className="text-sm" style={{ color: "var(--text-body)" }}><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.summarySkills}</span> {skills}</p>}
                        {jobDescription && (
                            <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--recruiter-soft-border)", background: "var(--recruiter-soft)" }}>
                                <p className="text-xs font-semibold mb-1" style={{ color: "var(--recruiter)" }}>Job Description</p>
                                <p className="text-xs line-clamp-3" style={{ color: "var(--text-body)" }}>{jobDescription.length > 120 ? `${jobDescription.slice(0, 120)}…` : jobDescription}</p>
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
                    <SectionCard className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5" style={{ color: "var(--recruiter)" }} />
                            <h3 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.uploadTitleRecruiter}</h3>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-body)" }}>{t.ext.uploadSubRecruiter}</p>

                        <label htmlFor="cvFiles"
                            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition"
                            style={{
                                borderColor: uploading ? "var(--recruiter-soft-border)" : "var(--recruiter)",
                                background: uploading ? "var(--recruiter-soft)" : "transparent",
                                opacity: uploading ? 0.8 : 1,
                            }}>
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-8 w-8" style={{ color: "var(--recruiter)" }} viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-sm font-semibold" style={{ color: "var(--recruiter)" }}>Uploading {uploadingFileNames.length > 1 ? `${uploadingFileNames.length} files` : uploadingFileNames[0] ?? "file"}…</span>
                                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>Please wait</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8" style={{ color: "var(--recruiter)" }} />
                                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.uploadClickBrowse}</span>
                                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>{t.ext.uploadFormats} · {t.ext.uploadMax5}</span>
                                </>
                            )}
                        </label>
                        <input id="cvFiles" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx" className="sr-only"
                            onChange={handleFilesChange} disabled={uploading || selectedCvs.length >= 5} />

                        {selectedCvs.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{selectedCvs.length} / 5 CVs</span>
                                    <button onClick={handleClearAll} className="text-xs transition" style={{ color: "var(--text-body)" }}>Clear all</button>
                                </div>
                                {selectedCvs.map((cv, idx) => (
                                    <div key={cv.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-tinted)" }}>
                                        <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "var(--recruiter)" }} />
                                        <span className="flex-1 truncate text-sm" style={{ color: "var(--text-primary)" }}>{cv.original_filename}</span>
                                        <button onClick={() => handleRemoveFile(idx)} className="flex-shrink-0 rounded p-0.5 transition" style={{ color: "var(--text-faint)" }}>
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => setStep(1)}
                                className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-medium transition"
                                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-body)" }}>
                                ← Back
                            </button>
                            <button onClick={handleRunMatching} disabled={!canRunMatching}
                                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "var(--recruiter)", boxShadow: "var(--shadow-cta)" }}>
                                <Sparkles className="h-4 w-4" />
                                {t.ext.runMatching}
                            </button>
                        </div>
                    </SectionCard>

                    {/* Tips panel */}
                    <SectionCard className="p-6 md:p-8 space-y-4" style={{ borderStyle: "dashed" } as any}>
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5" style={{ color: "var(--recruiter)" }} />
                            <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.tipsTitle}</h3>
                        </div>
                        <ul className="space-y-3 text-sm" style={{ color: "var(--text-body)" }}>
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--recruiter)" }} />{t.ext.tip1}</li>
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--recruiter)" }} />{t.ext.tip2}</li>
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--recruiter)" }} />{t.ext.tip3}</li>
                        </ul>
                    </SectionCard>
                </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.ext.matchResultsTitle}</h2>
                            <p className="mt-1 text-sm" style={{ color: "var(--text-body)" }}>{t.ext.matchResultsSub}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {hasResults && (
                                <button onClick={() => exportResultsToCSV(results)}
                                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition"
                                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-body)" }}>
                                    <Download className="h-3.5 w-3.5" /> Export CSV
                                </button>
                            )}
                            <button onClick={handleReset}
                                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition"
                                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-body)" }}>
                                <RefreshCw className="h-3.5 w-3.5" /> {t.ext.newSession}
                            </button>
                        </div>
                    </div>

                    {matchError && (
                        <div className="flex items-start gap-4 rounded-2xl border p-5" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-600">{t.ext.matchingFailed}</p>
                                <p className="mt-1 text-xs text-red-500">{matchError}</p>
                            </div>
                            <button onClick={handleRetry}
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition">
                                <RefreshCw className="h-3 w-3" /> Retry
                            </button>
                        </div>
                    )}

                    {isRunning && <ResultSkeleton />}

                    {!isRunning && hasResults && (
                        <div className="space-y-4">
                            {[...results].sort((a, b) => b.match_score - a.match_score).map((result, idx) => {
                                const verdict = verdictFromScore(result.match_score);
                                const allQuestionsMarkdown = buildAllQuestionsMarkdown(jobDomain, result.reasons.strengths ?? [], result.reasons.risks ?? []);
                                return (
                                    <SectionCard key={result.cv_id} className="overflow-hidden">
                                        {/* Header */}
                                        <div className="flex flex-wrap items-start gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
                                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${verdict.cls}`}>
                                                {verdict.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>#{idx + 1}</span>
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdict.cls}`}>
                                                        {verdict.label}
                                                    </span>
                                                </div>
                                                <p className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>{result.file_name}</p>
                                                <p className="text-xs" style={{ color: "var(--text-body)" }}>{verdict.sublabel}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <div className="text-3xl font-bold" style={{ color: "var(--recruiter)" }}>{result.match_score}</div>
                                                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>/ 100</div>
                                                <div className="w-20 h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "var(--muted)" }}>
                                                    <div className={`h-full rounded-full ${verdict.bar}`} style={{ width: `${result.match_score}%` }} />
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveFromResults(result.cv_id)}
                                                className="flex-shrink-0 rounded-lg p-1.5 transition"
                                                style={{ color: "var(--text-faint)" }} title="Remove candidate">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Score rings */}
                                        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
                                            <p className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{t.ext.scoreBreakdown}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                                                <ScoreRing value={result.match_score}        label={t.ext.overallMatch}  color="var(--recruiter)" />
                                                <ScoreRing value={result.skills_match_score} label={t.ext.skillsHeading} color="#3b82f6" />
                                                <ScoreRing value={result.experience_score}   label={t.ext.expHeading}    color="#8b5cf6" />
                                                <ScoreRing value={result.cv_quality_score}   label={t.ext.quality}       color="#10b981" />
                                            </div>
                                        </div>

                                        {/* AI explanation */}
                                        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{t.ext.fitExplanation}</p>
                                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-body)" }}>{result.reasons.overall_reason}</p>
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                {result.reasons.strengths?.length > 0 && (
                                                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)" }}>
                                                        <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-emerald-600">{t.ext.exploreStrengths}</p>
                                                        <ul className="space-y-1">
                                                            {result.reasons.strengths.map((s, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                                                                    <Star className="h-3 w-3 flex-shrink-0 mt-0.5" />{s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {result.reasons.risks?.length > 0 && (
                                                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)" }}>
                                                        <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-amber-600">{t.ext.probeGaps}</p>
                                                        <ul className="space-y-1">
                                                            {result.reasons.risks.map((r, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                                                                    <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />{r}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Interview questions */}
                                        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
                                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle className="h-4 w-4" style={{ color: "var(--recruiter)" }} />
                                                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{t.ext.suggestedQuestions}</p>
                                                </div>
                                                <CopyAllQuestionsButton questions={allQuestionsMarkdown} />
                                            </div>
                                            <div className="mb-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-faint)" }}>General Fit</p>
                                                <div className="space-y-2">
                                                    {[
                                                        `Walk me through your most relevant experience for this ${jobDomain} role and why it fits.`,
                                                        `What would your first 90 days look like if you joined us in this position?`,
                                                        `How do you stay current in ${jobDomain}? Any recent learning or projects?`,
                                                    ].map((q, i) => (
                                                        <div key={i} className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface-tinted)", color: "var(--text-primary)" }}>
                                                            <span className="flex-1 leading-relaxed">{q}</span>
                                                            <CopyButton text={q} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {result.reasons.strengths?.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-emerald-600">{t.ext.exploreStrengths}</p>
                                                    <div className="space-y-2">
                                                        {result.reasons.strengths.map((s, i) => {
                                                            const q = `Your profile shows strength in "${s}" — can you walk me through a specific project or situation where this made a real impact?`;
                                                            return (
                                                                <div key={i} className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)", color: "#166534" }}>
                                                                    <span className="flex-1 leading-relaxed">{q}</span>
                                                                    <CopyButton text={q} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {result.reasons.risks?.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-amber-600">{t.ext.probeGaps}</p>
                                                    <div className="space-y-2">
                                                        {result.reasons.risks.map((r, i) => {
                                                            const q = `I noticed "${r}" in the profile. How do you approach this in your day-to-day work, and how have you improved in this area?`;
                                                            return (
                                                                <div key={i} className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)", color: "#92400e" }}>
                                                                    <span className="flex-1 leading-relaxed">{q}</span>
                                                                    <CopyButton text={q} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recruiter notes */}
                                        <div className="px-6 py-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <NotebookPen className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
                                                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Recruiter Notes</p>
                                            </div>
                                            <textarea
                                                value={candidateNotes[result.cv_id] ?? ""}
                                                onChange={(e) => setCandidateNotes((prev) => ({ ...prev, [result.cv_id]: e.target.value }))}
                                                rows={3}
                                                placeholder="Add your private notes about this candidate…"
                                                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition resize-none"
                                                style={{ borderColor: "var(--border)", background: "var(--input-bg)", color: "var(--input-text)" }}
                                            />
                                        </div>
                                    </SectionCard>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
