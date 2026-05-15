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
    BarChart2,
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
    FileInput,
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
        cls: "bg-emerald-50 border-emerald-300 text-emerald-800",
        bar: "bg-emerald-500",
    };
    if (score >= 65) return {
        label: "Recommended",
        sublabel: "Good profile — worth a first interview.",
        icon: <ThumbsUp className="h-6 w-6" />,
        cls: "bg-blue-50 border-blue-300 text-blue-800",
        bar: "bg-blue-500",
    };
    if (score >= 45) return {
        label: "Borderline",
        sublabel: "Some gaps to probe — keep as backup.",
        icon: <Minus className="h-6 w-6" />,
        cls: "bg-amber-50 border-amber-300 text-amber-800",
        bar: "bg-amber-500",
    };
    return {
        label: "Not Recommended",
        sublabel: "Profile doesn't meet the core requirements.",
        icon: <ThumbsDown className="h-6 w-6" />,
        cls: "bg-red-50 border-red-300 text-red-800",
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
            <span className="text-[11px] font-semibold text-center text-muted-foreground leading-tight max-w-[64px]">{label}</span>
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
            className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Copy question"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
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
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-border/60 bg-background text-muted-foreground hover:border-recruiter/60 hover:bg-recruiter/5 hover:text-recruiter"
            }`}
            title="Copy all interview questions as Markdown"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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

function buildAllQuestionsMarkdown(
    jobDomain: string,
    strengths: string[],
    risks: string[]
): string {
    const generalQuestions = [
        `Walk me through your most relevant experience for this ${jobDomain} role and why it fits.`,
        `What would your first 90 days look like if you joined us in this position?`,
        `How do you stay current in ${jobDomain}? Any recent learning or projects?`,
    ];
    const strengthQuestions = strengths.map(
        (s) => `Your profile shows strength in "${s}" — can you walk me through a specific project or situation where this made a real impact?`
    );
    const riskQuestions = risks.map(
        (r) => `I noticed "${r}" in the profile. How do you approach this in your day-to-day work, and how have you improved in this area?`
    );
    const lines: string[] = [];
    lines.push("## Interview Questions\n");
    lines.push("### General Fit\n");
    generalQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    if (strengthQuestions.length > 0) {
        lines.push("\n### Explore Strengths\n");
        strengthQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    }
    if (riskQuestions.length > 0) {
        lines.push("\n### Probe Gaps\n");
        riskQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    }
    return lines.join("\n");
}

function exportResultsToCSV(results: MatchResult[]) {
    const headers = ["File Name", "Overall Score", "Skills Score", "Experience Score", "CV Quality Score", "Verdict", "Strengths", "Risks"];
    const rows = [...results]
        .sort((a, b) => b.match_score - a.match_score)
        .map((r) => {
            const verdict = verdictFromScore(r.match_score).label;
            const strengths = (r.reasons.strengths ?? []).join(" | ");
            const risks = (r.reasons.risks ?? []).join(" | ");
            return [
                `"${r.file_name.replace(/"/g, '""')}"`,
                r.match_score, r.skills_match_score, r.experience_score, r.cv_quality_score,
                `"${verdict}"`,
                `"${strengths.replace(/"/g, '""')}"`,
                `"${risks.replace(/"/g, '""')}"`,
            ].join(",");
        });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `krino-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function ResultSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="rounded-2xl border-2 border-border/40 bg-card/60 px-6 py-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-3 w-24 rounded-full bg-muted" />
                    <div className="h-4 w-48 rounded-full bg-muted" />
                    <div className="h-3 w-full rounded-full bg-muted" />
                    <div className="h-3 w-4/5 rounded-full bg-muted" />
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                    <div className="h-10 w-12 rounded-lg bg-muted" />
                    <div className="h-2.5 w-8 rounded-full bg-muted" />
                </div>
            </div>
            <div className="rounded-3xl border border-border/40 bg-card/60 p-6 md:p-8">
                <div className="mb-6 h-5 w-36 rounded-full bg-muted" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-[68px] w-[68px] rounded-full bg-muted" />
                            <div className="h-3 w-14 rounded-full bg-muted" />
                        </div>
                    ))}
                </div>
            </div>
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
            <div className="space-y-8">
                {/* Page header */}
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-recruiter">
                        {t.nav.dashboard} &mdash; {t.hero.roleRecruiter}
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">{t.ext.talentMgmt}</h1>
                    <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                        {t.ext.talentMgmtSub}
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="flex flex-wrap gap-3">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                    isActive
                                        ? "bg-recruiter text-white shadow-md"
                                        : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                <RecruiterMatchFlow accessToken={accessToken ?? null} activeTab={activeTab} />
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
                    res = await fetch(`${backendBaseUrl}/api/v1/cv/upload`, {
                        method: "POST", credentials: "include", body: formData,
                    });
                } catch (networkErr) {
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

    // ─── ANALYTICS TAB ───────────────────────────────────────────────────────
    if (activeTab === "analytics") {
        return (
            <div className="space-y-8">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        {t.ext.tabAnalytics}
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">{t.ext.compareDepth}</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">{t.ext.selectCvCompare}</p>
                </div>

                {!hasResults && (
                    <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-8 text-center text-sm md:text-base text-muted-foreground">
                        Run a match in the Candidates tab first to see analytics here.
                    </div>
                )}

                {hasResults && focusedResult && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => (
                                <button key={r.cv_id} onClick={() => setFocusedIndex(idx)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm font-semibold transition ${
                                        idx === safeIndex ? "border-recruiter bg-recruiter text-white" : "border-border/60 bg-card/80 text-foreground hover:border-recruiter/70"
                                    }`}>
                                    <span className="truncate max-w-[140px] md:max-w-[220px]">{r.file_name}</span>
                                    <span className="text-[11px] md:text-xs opacity-80">{r.match_score}/100</span>
                                </button>
                            ))}
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                            <div className="space-y-5 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.matchMetrics}</h3>
                                        <p className="mt-1 text-xs md:text-sm text-muted-foreground">{t.ext.metricsSub}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl md:text-4xl font-bold text-recruiter">{focusedResult.match_score}</div>
                                        <div className="text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground">Overall match / 100</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: t.ext.domainFit,     value: focusedResult.match_score,         helper: t.ext.overallMatch },
                                        { label: t.ext.skillsHeading, value: focusedResult.skills_match_score,  helper: t.ext.skillsHeading },
                                        { label: t.ext.expHeading,    value: focusedResult.experience_score,   helper: t.ext.expHeading },
                                        { label: t.ext.quality,       value: focusedResult.cv_quality_score,   helper: t.ext.quality },
                                    ].map((m) => (
                                        <div key={m.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs md:text-sm font-medium text-foreground">
                                                <span>{m.label}</span><span>{m.value}/100</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full bg-recruiter transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }} />
                                            </div>
                                            <p className="text-[11px] md:text-xs text-muted-foreground">{m.helper}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                                <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.fitExplanation}</h3>
                                <p className="text-sm md:text-base text-muted-foreground">{focusedResult.reasons.overall_reason}</p>
                                {focusedResult.reasons.strengths?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-1">{t.ext.exploreStrengths}</h4>
                                        <ul className="list-disc pl-5 text-xs md:text-sm text-emerald-700 space-y-1">
                                            {focusedResult.reasons.strengths.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {focusedResult.reasons.risks?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-amber-700 mb-1">{t.ext.probeGaps}</h4>
                                        <ul className="list-disc pl-5 text-xs md:text-sm text-amber-700 space-y-1">
                                            {focusedResult.reasons.risks.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ─── CANDIDATES TAB (default) ─────────────────────────────────────────────
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        {t.ext.recruiterWorkspace}
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">{t.ext.matchMultiple}</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">{t.ext.matchMultipleSub}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-xs md:text-sm text-muted-foreground max-w-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <SlidersHorizontal className="h-4 w-4 text-recruiter" />
                        {t.ext.quickMatchingTitle}
                    </div>
                    <p className="mt-1">{t.ext.quickMatchingSteps}</p>
                </div>
            </div>

            {/* Step indicators */}
            <div className="grid gap-4 md:grid-cols-3">
                {steps.map((item) => {
                    const isActive = step === item.id;
                    const isCompleted = step > item.id;
                    return (
                        <div key={item.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 md:px-5 md:py-4 ${
                            isActive ? "border-recruiter bg-recruiter/5" : "border-border/60 bg-card/60"
                        }`}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                isActive ? "bg-recruiter text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : item.id}
                            </div>
                            <div className="text-xs md:text-sm font-medium uppercase tracking-wide">{item.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
                    <div className="space-y-6 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-recruiter" />
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">{t.ext.defineRoleTitle}</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">{t.ext.jobDomainLabel}</label>
                                <select value={jobDomain} onChange={(e) => setJobDomain(e.target.value)}
                                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
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
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.expRangeLabel}</label>
                                    <select value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectExp}</option>
                                        <option>0-1 years</option><option>2-4 years</option><option>5-7 years</option><option>8+ years</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.salaryRangeLabel}</label>
                                    <select value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectSalary}</option>
                                        <option>$40k - $60k</option><option>$60k - $90k</option><option>$90k - $120k</option><option>$120k+</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.locationLabel}</label>
                                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.ext.locationPlaceholder}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.contractTypeLabel}</label>
                                    <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectType}</option>
                                        <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">{t.ext.keySkillsNotesLabel}</label>
                                <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={3}
                                    placeholder={t.ext.keySkillsNotesPlaceholder}
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Job Description</label>
                                    <span className="rounded-full bg-recruiter/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-recruiter">Recommended</span>
                                </div>
                                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={5}
                                    placeholder="Paste the full job description here — the AI will use it for precise matching..."
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60 resize-none" />
                                <p className="text-[11px] text-muted-foreground">Including the full JD gives the AI richer context and produces more accurate match scores.</p>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button disabled={!canContinueFromStep1} onClick={() => setStep(2)}
                                className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg">
                                {t.ext.continueToCvs}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.roleSummaryTitle}</h3>
                        <p className="text-sm text-muted-foreground">{t.ext.roleSummarySub}</p>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li><span className="font-semibold text-foreground">{t.ext.summaryDomain}</span> {jobDomain}</li>
                            <li><span className="font-semibold text-foreground">{t.ext.summaryExp}</span> {experienceRange || t.ext.notSetYet}</li>
                            <li><span className="font-semibold text-foreground">{t.ext.summarySalary}</span> {salaryRange || t.ext.notSetYet}</li>
                            <li><span className="font-semibold text-foreground">{t.ext.summaryLocation}</span> {location || t.ext.notSetYet}</li>
                            <li><span className="font-semibold text-foreground">{t.ext.summaryContract}</span> {employmentType || t.ext.notSetYet}</li>
                        </ul>
                        {skills && <p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{t.ext.summarySkills}</span> {skills}</p>}
                        {jobDescription && (
                            <div className="mt-2 rounded-xl border border-recruiter/20 bg-recruiter/5 px-3 py-2">
                                <p className="text-xs font-semibold text-recruiter mb-1">Job Description</p>
                                <p className="text-xs text-muted-foreground line-clamp-3">{jobDescription.length > 120 ? `${jobDescription.slice(0, 120)}…` : jobDescription}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
                    <div className="space-y-6 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-recruiter" />
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">{t.ext.uploadTitleRecruiter}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{t.ext.uploadSubRecruiter}</p>

                        <label htmlFor="cvFiles"
                            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                                uploading ? "border-recruiter/40 bg-recruiter/5 cursor-not-allowed" : "border-recruiter/60 bg-background/60 hover:border-recruiter hover:bg-recruiter/5"
                            }`}>
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-8 w-8 text-recruiter" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-recruiter">Uploading {uploadingFileNames.length > 1 ? `${uploadingFileNames.length} files` : uploadingFileNames[0] ?? "file"}…</span>
                                    <span className="text-xs text-muted-foreground">Please wait</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-recruiter" />
                                    <span className="text-sm font-semibold text-foreground">{t.ext.uploadClickBrowse}</span>
                                    <span className="text-xs text-muted-foreground">{t.ext.uploadFormats} · {t.ext.uploadMax5}</span>
                                </>
                            )}
                        </label>
                        <input
                            id="cvFiles"
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            className="sr-only"
                            onChange={handleFilesChange}
                            disabled={uploading || selectedCvs.length >= 5}
                        />

                        {selectedCvs.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedCvs.length} / 5 CVs</span>
                                    <button onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-foreground transition">
                                        Clear all
                                    </button>
                                </div>
                                {selectedCvs.map((cv, idx) => (
                                    <div key={cv.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5">
                                        <FileText className="h-4 w-4 text-recruiter flex-shrink-0" />
                                        <span className="flex-1 truncate text-sm text-foreground">{cv.original_filename}</span>
                                        <button onClick={() => handleRemoveFile(idx)} className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => setStep(1)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition">
                                ← Back
                            </button>
                            <button
                                onClick={handleRunMatching}
                                disabled={!canRunMatching}
                                className="inline-flex items-center gap-2 rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <Sparkles className="h-4 w-4" />
                                {t.ext.runMatching}
                            </button>
                        </div>
                    </div>

                    {/* Tips panel */}
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-recruiter" />
                            <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.tipsTitle}</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-recruiter flex-shrink-0 mt-0.5" />{t.ext.tip1}</li>
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-recruiter flex-shrink-0 mt-0.5" />{t.ext.tip2}</li>
                            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-recruiter flex-shrink-0 mt-0.5" />{t.ext.tip3}</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
                <div className="space-y-6">
                    {/* Top bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="font-serif text-2xl md:text-3xl text-foreground">{t.ext.matchResultsTitle}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t.ext.matchResultsSub}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {hasResults && (
                                <button
                                    onClick={() => exportResultsToCSV(results)}
                                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-recruiter/60 hover:text-recruiter transition"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </button>
                            )}
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                {t.ext.newSession}
                            </button>
                        </div>
                    </div>

                    {/* Error state */}
                    {matchError && (
                        <div className="flex items-start gap-4 rounded-2xl border border-red-300 bg-red-50 p-5">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">{t.ext.matchingFailed}</p>
                                <p className="mt-1 text-xs text-red-700">{matchError}</p>
                            </div>
                            <button onClick={handleRetry}
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition">
                                <RefreshCw className="h-3 w-3" /> Retry
                            </button>
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {isRunning && <ResultSkeleton />}

                    {/* Results list */}
                    {!isRunning && hasResults && (
                        <div className="space-y-4">
                            {[...results]
                                .sort((a, b) => b.match_score - a.match_score)
                                .map((result, idx) => {
                                    const verdict = verdictFromScore(result.match_score);
                                    const allQuestionsMarkdown = buildAllQuestionsMarkdown(
                                        jobDomain,
                                        result.reasons.strengths ?? [],
                                        result.reasons.risks ?? []
                                    );
                                    return (
                                        <div key={result.cv_id} className="rounded-3xl border border-border/60 bg-card/80 overflow-hidden">
                                            {/* Candidate header */}
                                            <div className="flex flex-wrap items-start gap-4 px-6 py-5 border-b border-border/40">
                                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${verdict.cls}`}>
                                                    {verdict.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">#{idx + 1}</span>
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdict.cls}`}>
                                                            {verdict.icon}
                                                            {verdict.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 truncate text-base font-semibold text-foreground">{result.file_name}</p>
                                                    <p className="text-xs text-muted-foreground">{verdict.sublabel}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <div className="text-3xl font-bold text-recruiter">{result.match_score}</div>
                                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">/ 100</div>
                                                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                                                        <div className={`h-full rounded-full ${verdict.bar} transition-all duration-500`} style={{ width: `${result.match_score}%` }} />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFromResults(result.cv_id)}
                                                    className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                                                    title="Remove candidate"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Score rings */}
                                            <div className="px-6 py-5 border-b border-border/40">
                                                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.ext.scoreBreakdown}</p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                                                    <ScoreRing value={result.match_score}         label={t.ext.overallMatch}  color="#f97316" />
                                                    <ScoreRing value={result.skills_match_score}  label={t.ext.skillsHeading} color="#3b82f6" />
                                                    <ScoreRing value={result.experience_score}    label={t.ext.expHeading}    color="#8b5cf6" />
                                                    <ScoreRing value={result.cv_quality_score}    label={t.ext.quality}       color="#10b981" />
                                                </div>
                                            </div>

                                            {/* AI explanation */}
                                            <div className="px-6 py-5 border-b border-border/40">
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.ext.fitExplanation}</p>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{result.reasons.overall_reason}</p>
                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    {result.reasons.strengths?.length > 0 && (
                                                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">{t.ext.exploreStrengths}</p>
                                                            <ul className="space-y-1">
                                                                {result.reasons.strengths.map((s, i) => (
                                                                    <li key={i} className="flex items-start gap-2 text-xs text-emerald-800">
                                                                        <Star className="h-3 w-3 flex-shrink-0 mt-0.5" />{s}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {result.reasons.risks?.length > 0 && (
                                                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">{t.ext.probeGaps}</p>
                                                            <ul className="space-y-1">
                                                                {result.reasons.risks.map((r, i) => (
                                                                    <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                                                                        <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />{r}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Interview questions */}
                                            <div className="px-6 py-5 border-b border-border/40">
                                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <MessageCircle className="h-4 w-4 text-recruiter" />
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.ext.suggestedQuestions}</p>
                                                    </div>
                                                    <CopyAllQuestionsButton questions={allQuestionsMarkdown} />
                                                </div>

                                                {/* General questions */}
                                                <div className="mb-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-2">General Fit</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            `Walk me through your most relevant experience for this ${jobDomain} role and why it fits.`,
                                                            `What would your first 90 days look like if you joined us in this position?`,
                                                            `How do you stay current in ${jobDomain}? Any recent learning or projects?`,
                                                        ].map((q, i) => (
                                                            <div key={i} className="flex items-start gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-xs text-foreground">
                                                                <span className="flex-1 leading-relaxed">{q}</span>
                                                                <CopyButton text={q} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Strength questions */}
                                                {result.reasons.strengths?.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600/80 mb-2">{t.ext.exploreStrengths}</p>
                                                        <div className="space-y-2">
                                                            {result.reasons.strengths.map((s, i) => {
                                                                const q = `Your profile shows strength in "${s}" — can you walk me through a specific project or situation where this made a real impact?`;
                                                                return (
                                                                    <div key={i} className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
                                                                        <span className="flex-1 leading-relaxed">{q}</span>
                                                                        <CopyButton text={q} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Risk questions */}
                                                {result.reasons.risks?.length > 0 && (
                                                    <div>
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600/80 mb-2">{t.ext.probeGaps}</p>
                                                        <div className="space-y-2">
                                                            {result.reasons.risks.map((r, i) => {
                                                                const q = `I noticed "${r}" in the profile. How do you approach this in your day-to-day work, and how have you improved in this area?`;
                                                                return (
                                                                    <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
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
                                                    <NotebookPen className="h-4 w-4 text-muted-foreground" />
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recruiter Notes</p>
                                                </div>
                                                <textarea
                                                    value={candidateNotes[result.cv_id] ?? ""}
                                                    onChange={(e) => setCandidateNotes((prev) => ({ ...prev, [result.cv_id]: e.target.value }))}
                                                    rows={3}
                                                    placeholder="Add your private notes about this candidate…"
                                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/40 resize-none"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
