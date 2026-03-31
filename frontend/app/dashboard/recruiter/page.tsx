"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    BarChart3,
    Briefcase,
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
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import Protected from "@/components/Protected";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "candidates" | "analytics" | "yourtoolkit" | "jobs";
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

// ─── CopyAllQuestionsButton ───────────────────────────────────────────────────

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

// ─── buildAllQuestionsMarkdown ────────────────────────────────────────────────

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

// ─── exportResultsToCSV ───────────────────────────────────────────────────────
// Task 3: Export results as a downloadable CSV file

function exportResultsToCSV(results: MatchResult[]) {
    const headers = [
        "File Name",
        "Overall Score",
        "Skills Score",
        "Experience Score",
        "CV Quality Score",
        "Verdict",
        "Strengths",
        "Risks",
    ];

    const rows = [...results]
        .sort((a, b) => b.match_score - a.match_score)
        .map((r) => {
            const verdict = verdictFromScore(r.match_score).label;
            const strengths = (r.reasons.strengths ?? []).join(" | ");
            const risks = (r.reasons.risks ?? []).join(" | ");
            return [
                `"${r.file_name.replace(/"/g, '""')}"`,
                r.match_score,
                r.skills_match_score,
                r.experience_score,
                r.cv_quality_score,
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
    link.download = `pathwise-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── ResultSkeleton ───────────────────────────────────────────────────────────
// Task 5: Loading skeleton shown while AI matching is running

function ResultSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Top verdict card skeleton */}
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
            {/* Score rings skeleton */}
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
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="h-3 w-32 rounded-full bg-muted" />
                            <div className="h-2 w-full rounded-full bg-muted" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Interview questions skeleton */}
            <div className="rounded-3xl border border-border/40 bg-card/60 p-6 md:p-8 space-y-4">
                <div className="h-5 w-48 rounded-full bg-muted" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
                            <div className="h-6 w-6 rounded-full bg-muted flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-full rounded-full bg-muted" />
                                <div className="h-3 w-3/4 rounded-full bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterDashboardPage() {
    const { email, accessToken } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabId>("candidates");

    const tabs = [
        { id: "candidates" as TabId, label: t.ext.tabCandidates, icon: Users },
        { id: "analytics" as TabId, label: t.ext.tabAnalytics, icon: BarChart3 },
        { id: "yourtoolkit" as TabId, label: t.ext.tabToolkit, icon: Sparkles },
        { id: "jobs" as TabId, label: t.ext.tabJobs, icon: Briefcase },
    ];

    return (
        <Protected>
            <div className="min-h-screen bg-background font-sans text-foreground overflow-x-hidden">
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-recruiter/10 rounded-full blur-[100px] animate-blob mix-blend-multiply" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply" />
                </div>

                {/* ── Fixed Header ── */}
                <header className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-recruiter/95 via-orange-600/95 to-red-600/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
                    <div className="container mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white select-none cursor-default">
                                Pathwise
                            </span>
                            <span className="hidden md:inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-50 whitespace-nowrap">
                                {t.hero.roleRecruiter}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                            <LanguageSwitcher />
                            {email && (
                                <span className="hidden sm:inline-block max-w-[140px] lg:max-w-[220px] truncate text-sm font-medium text-orange-50/90">
                                    {email}
                                </span>
                            )}
                            <ProfileDropdown />
                        </div>
                    </div>
                </header>

                <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
                    <div className="mb-12">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-recruiter">
                            {t.nav.dashboard} &mdash; {t.hero.roleRecruiter}
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{t.ext.talentMgmt}</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl">
                            {t.ext.talentMgmtSub}
                        </p>
                    </div>

                    <div className="mb-8 flex flex-wrap gap-3">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm md:text-base font-semibold transition-all ${
                                        isActive
                                            ? "bg-recruiter text-white shadow-md"
                                            : "bg-white text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-border/50"
                                    }`}
                                >
                                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-2">
                        <RecruiterMatchFlow accessToken={accessToken ?? null} activeTab={activeTab} />
                    </div>
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
    // Task 4.1 — job description free-text state
    const [jobDescription, setJobDescription] = useState("");
    const [selectedCvs, setSelectedCvs] = useState<SelectedCv[]>([]);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([]);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    // Task 2 — candidate notes keyed by cv_id
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
                        method: "POST",
                        credentials: "include",
                        body: formData,
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
                            const alreadyAdded =
                                selectedCvs.some((c) => c.id === match.id) ||
                                successfulThisBatch.some((c) => c.id === match.id);
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
                const alreadyAdded =
                    selectedCvs.some((c) => c.id === created.id) ||
                    successfulThisBatch.some((c) => c.id === created.id);
                if (!alreadyAdded) successfulThisBatch.push(created);
            }

            if (successfulThisBatch.length > 0) {
                setSelectedCvs((prev) => [...prev, ...successfulThisBatch].slice(0, 5));
            }
        } catch (err: any) {
            if (successfulThisBatch.length > 0) {
                setSelectedCvs((prev) => [...prev, ...successfulThisBatch].slice(0, 5));
            }
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: err?.message ?? "Something went wrong. Successfully uploaded files are still attached.",
            });
        } finally {
            setUploading(false);
            setUploadingFileNames([]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedCvs((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => {
        setSelectedCvs([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRunMatching = async () => {
        if (!selectedCvs.length || !accessToken) return;
        setIsRunning(true);
        setResults([]);
        setMatchError(null);
        // Task 5: transition to step 3 immediately to show skeleton
        setStep(3);
        try {
            // Task 4.4 — include job_description in the payload
            const payload = {
                job: {
                    domain: jobDomain,
                    experience_range: experienceRange,
                    salary_range: salaryRange,
                    location,
                    contract_type: employmentType,
                    skills_text: skills,
                    job_description: jobDescription || undefined,
                },
                cv_ids: selectedCvs.map((cv) => cv.id),
            };
            const res = await fetch(`${backendBaseUrl}/api/v1/recruiter/match-cvs`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => null);
                throw new Error((d as any)?.detail ?? "Matching failed");
            }
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

    const handleRetry = () => {
        setMatchError(null);
        handleRunMatching();
    };

    const handleRemoveFromResults = (cvId: number) => {
        setResults((prev) => prev.filter((r) => r.cv_id !== cvId));
        setSelectedCvs((prev) => prev.filter((cv) => cv.id !== cvId));
        setFocusedIndex(0);
    };

    const handleReset = () => {
        setStep(1);
        setSelectedCvs([]);
        setResults([]);
        setMatchError(null);
        setFocusedIndex(0);
        setCandidateNotes({});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const hasResults = results.length > 0;
    const safeIndex = Math.min(focusedIndex, Math.max(results.length - 1, 0));
    const focusedResult = hasResults ? results[safeIndex] : null;

    if (activeTab === "yourtoolkit") {
        return (
            <div className="space-y-8 relative z-10">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-recruiter">
                        <Sparkles className="h-3.5 w-3.5" /> {t.ext.aiPowered}
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">{t.ext.tabToolkit}</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        {t.ext.toolkitDesc}
                    </p>
                </div>

                {!hasResults && !isRunning && (
                    <div className="rounded-3xl border-2 border-dashed border-recruiter/30 bg-recruiter/5 p-14 text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-recruiter/40 mb-4" />
                        <p className="text-lg font-semibold text-foreground">{t.ext.noCandidatesYet}</p>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                            {t.ext.goUploadDesc}
                        </p>
                    </div>
                )}

                {/* Task 5: show skeleton while running */}
                {isRunning && <ResultSkeleton />}

                {hasResults && !isRunning && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => {
                                const isActive = idx === safeIndex;
                                return (
                                    <button
                                        key={r.cv_id}
                                        onClick={() => setFocusedIndex(idx)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                                            isActive
                                                ? "border-recruiter bg-recruiter text-white shadow-md"
                                                : "border-border/60 bg-card/80 text-foreground hover:border-recruiter/60"
                                        }`}
                                    >
                                        <span className="truncate max-w-[150px] md:max-w-[240px]">{r.file_name}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                            isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                        }`}>{r.match_score}/100</span>
                                    </button>
                                );
                            })}
                        </div>

                        {focusedResult && (
                            <div className="space-y-6">

                                {/* ── 1. HIRING VERDICT ── */}
                                {(() => {
                                    const v = verdictFromScore(focusedResult.match_score);
                                    return (
                                        <div className={`flex items-start gap-4 rounded-2xl border-2 px-6 py-5 ${v.cls}`}>
                                            <div className="flex-shrink-0 mt-0.5">{v.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">{t.ext.aiHiringVerdict}</p>
                                                    <span className="rounded-full border px-3 py-0.5 text-sm font-bold border-current">{v.label}</span>
                                                </div>
                                                <p className="mt-1.5 text-sm md:text-base font-medium">{v.sublabel}</p>
                                                <p className="mt-1 text-xs md:text-sm opacity-80 leading-relaxed">{focusedResult.reasons.overall_reason}</p>
                                            </div>
                                            <div className="flex-shrink-0 text-right hidden sm:block">
                                                <div className="text-4xl font-black">{focusedResult.match_score}</div>
                                                <div className="text-[10px] uppercase tracking-widest opacity-60">/ 100</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ── 2. SCORE BREAKDOWN ── */}
                                <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                    <div className="mb-6 flex items-center gap-2">
                                        <BarChart2 className="h-5 w-5 text-recruiter" />
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.scoreBreakdown}</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
                                        <ScoreRing value={focusedResult.match_score} label={t.ext.overallMatch} color="var(--color-recruiter, #f97316)" />
                                        <ScoreRing value={focusedResult.skills_match_score} label={t.ext.skillsHeading} color="#3b82f6" />
                                        <ScoreRing value={focusedResult.experience_score} label={t.ext.expHeading} color="#8b5cf6" />
                                        <ScoreRing value={focusedResult.cv_quality_score} label={t.ext.quality} color="#10b981" />
                                    </div>
                                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                                        {[
                                            { label: t.ext.overallMatch, value: focusedResult.match_score, color: "bg-recruiter" },
                                            { label: t.ext.skillsHeading, value: focusedResult.skills_match_score, color: "bg-blue-500" },
                                            { label: t.ext.expHeading, value: focusedResult.experience_score, color: "bg-violet-500" },
                                            { label: t.ext.quality, value: focusedResult.cv_quality_score, color: "bg-emerald-500" },
                                        ].map((m) => (
                                            <div key={m.label} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-foreground">
                                                    <span>{m.label}</span><span>{m.value}/100</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full ${m.color} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── 3. INTERVIEW QUESTIONS ── */}
                                <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                    <div className="mb-2 flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5 text-recruiter" />
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.interviewQuestions}</h3>
                                    </div>
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs md:text-sm text-muted-foreground">
                                            {t.ext.interviewQuestionsSub}
                                        </p>
                                        <CopyAllQuestionsButton
                                            questions={buildAllQuestionsMarkdown(
                                                jobDomain,
                                                focusedResult.reasons.strengths ?? [],
                                                focusedResult.reasons.risks ?? []
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-5">
                                        {/* General */}
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <Target className="h-4 w-4 text-foreground/60" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t.ext.generalFit}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    `Walk me through your most relevant experience for this ${jobDomain} role and why it fits.`,
                                                    `What would your first 90 days look like if you joined us in this position?`,
                                                    `How do you stay current in ${jobDomain}? Any recent learning or projects?`,
                                                ].map((q, i) => (
                                                    <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3 hover:bg-muted/70 transition group">
                                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-recruiter/10 text-[11px] font-bold text-recruiter mt-0.5">{i + 1}</span>
                                                        <p className="flex-1 text-sm text-foreground leading-relaxed">{q}</p>
                                                        <CopyButton text={q} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Strengths */}
                                        {focusedResult.reasons.strengths?.length > 0 && (
                                            <div>
                                                <div className="mb-3 flex items-center gap-2">
                                                    <Zap className="h-4 w-4 text-emerald-600" />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t.ext.exploreStrengths}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {focusedResult.reasons.strengths.map((s, i) => {
                                                        const q = `Your profile shows strength in "${s}" — can you walk me through a specific project or situation where this made a real impact?`;
                                                        return (
                                                            <div key={i} className="flex items-start gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-3 hover:bg-emerald-50 transition group">
                                                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 mt-0.5">{i + 1}</span>
                                                                <p className="flex-1 text-sm text-emerald-900 leading-relaxed">{q}</p>
                                                                <CopyButton text={q} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Risks */}
                                        {focusedResult.reasons.risks?.length > 0 && (
                                            <div>
                                                <div className="mb-3 flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-700">{t.ext.probeGaps}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {focusedResult.reasons.risks.map((r, i) => {
                                                        const q = `I noticed "${r}" in the profile. How do you approach this in your day-to-day work, and how have you improved in this area?`;
                                                        return (
                                                            <div key={i} className="flex items-start gap-3 rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3 hover:bg-amber-50 transition group">
                                                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700 mt-0.5">{i + 1}</span>
                                                                <p className="flex-1 text-sm text-amber-900 leading-relaxed">{q}</p>
                                                                <CopyButton text={q} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── 4. RED FLAGS ── */}
                                {focusedResult.reasons.risks?.length > 0 && (
                                    <div className="rounded-3xl border border-red-200 bg-red-50/50 p-6 md:p-8">
                                        <div className="mb-2 flex items-center gap-2">
                                            <ShieldAlert className="h-5 w-5 text-red-600" />
                                            <h3 className="font-serif text-xl md:text-2xl text-red-800">{t.ext.redFlags}</h3>
                                        </div>
                                        <p className="mb-5 text-xs md:text-sm text-red-700/80">
                                            {t.ext.redFlagsSub}
                                        </p>
                                        <div className="space-y-3">
                                            {focusedResult.reasons.risks.map((flag, i) => (
                                                <div key={i} className="flex items-start gap-3 rounded-xl bg-white/70 border border-red-100 px-4 py-3">
                                                    <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                                                    <p className="text-sm text-red-800 leading-relaxed">{flag}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {focusedResult.experience_score < 50 && (
                                            <div className="mt-3 flex items-start gap-3 rounded-xl bg-white/70 border border-red-100 px-4 py-3">
                                                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                                                <p className="text-sm text-red-800 leading-relaxed">
                                                    Experience score is below 50 — verify claimed years of experience and seniority level during the interview.
                                                </p>
                                            </div>
                                        )}
                                        {focusedResult.skills_match_score < 50 && (
                                            <div className="mt-3 flex items-start gap-3 rounded-xl bg-white/70 border border-red-100 px-4 py-3">
                                                <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                                                <p className="text-sm text-red-800 leading-relaxed">
                                                    Skills overlap is limited — test hands-on proficiency for the key tools required by this role.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Task 2: CANDIDATE NOTES ── */}
                                <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                    <div className="mb-3 flex items-center gap-2">
                                        <NotebookPen className="h-5 w-5 text-recruiter" />
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">Private Notes</h3>
                                    </div>
                                    <p className="mb-3 text-xs text-muted-foreground">
                                        Session-only notes for this candidate. Not saved to the server.
                                    </p>
                                    <textarea
                                        value={candidateNotes[focusedResult.cv_id] ?? ""}
                                        onChange={(e) =>
                                            setCandidateNotes((prev) => ({
                                                ...prev,
                                                [focusedResult.cv_id]: e.target.value,
                                            }))
                                        }
                                        rows={3}
                                        placeholder="e.g. Called, left voicemail. Salary expectation seems high. Follow up Friday."
                                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60 resize-none"
                                    />
                                </div>

                                {/* ── 5. CANDIDATE COMPARISON TABLE ── */}
                                {results.length > 1 && (
                                    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-recruiter" />
                                            <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.allCandidatesGlance}</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                                                        <th className="pb-3 pr-3 font-semibold">{t.ext.candidateHeading}</th>
                                                        <th className="pb-3 pr-3 font-semibold">{t.ext.overallHeading}</th>
                                                        <th className="pb-3 pr-3 font-semibold">{t.ext.skillsHeading}</th>
                                                        <th className="pb-3 pr-3 font-semibold">{t.ext.expHeading}</th>
                                                        <th className="pb-3 font-semibold">{t.ext.verdictHeading}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {[...results]
                                                        .sort((a, b) => b.match_score - a.match_score)
                                                        .map((r, idx) => {
                                                            const v = verdictFromScore(r.match_score);
                                                            const isSelected = r.cv_id === focusedResult.cv_id;
                                                            return (
                                                                <tr
                                                                    key={r.cv_id}
                                                                    onClick={() => setFocusedIndex(results.indexOf(r))}
                                                                    className={`cursor-pointer transition ${
                                                                        isSelected ? "bg-recruiter/5" : "hover:bg-muted/30"
                                                                    }`}
                                                                >
                                                                    <td className="py-3 pr-3">
                                                                        <div className="flex items-center gap-2">
                                                                            {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                                                                            <span className={`truncate max-w-[140px] font-medium ${
                                                                                isSelected ? "text-recruiter" : "text-foreground"
                                                                            }`}>{r.file_name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 pr-3 font-bold text-foreground">{r.match_score}</td>
                                                                    <td className="py-3 pr-3 text-muted-foreground">{r.skills_match_score}</td>
                                                                    <td className="py-3 pr-3 text-muted-foreground">{r.experience_score}</td>
                                                                    <td className="py-3">
                                                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${v.cls}`}>
                                                                            {v.label}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    if (activeTab === "analytics") {
        return (
            <div className="space-y-8 relative z-10">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        {t.ext.tabAnalytics}
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">{t.ext.compareDepth}</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        {t.ext.selectCvCompare}
                    </p>
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
                                        { label: t.ext.domainFit, value: focusedResult.match_score, helper: t.ext.overallMatch },
                                        { label: t.ext.skillsHeading, value: focusedResult.skills_match_score, helper: t.ext.skillsHeading },
                                        { label: t.ext.expHeading, value: focusedResult.experience_score, helper: t.ext.expHeading },
                                        { label: t.ext.quality, value: focusedResult.cv_quality_score, helper: t.ext.quality },
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

    if (activeTab === "jobs") {
        return (
                <div className="bg-card rounded-3xl shadow-craft border border-border/40 min-h-[500px] relative z-10">
                <div className="p-6 md:p-10 text-center py-20">
                    <Briefcase className="w-16 h-16 text-recruiter mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-serif font-bold mb-2">{t.ext.tabJobs}</h2>
                    <p className="text-muted-foreground">{t.ext.comingSoon}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        {t.ext.recruiterWorkspace}
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">{t.ext.matchMultiple}</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        {t.ext.matchMultipleSub}
                    </p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-xs md:text-sm text-muted-foreground max-w-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <SlidersHorizontal className="h-4 w-4 text-recruiter" />
                        {t.ext.quickMatchingTitle}
                    </div>
                    <p className="mt-1">{t.ext.quickMatchingSteps}</p>
                </div>
            </div>

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
                                    <option>AI & Data</option>
                                    <option>Software Engineering</option>
                                    <option>Product Management</option>
                                    <option>Marketing & Growth</option>
                                    <option>Finance & Banking</option>
                                    <option>Design & UX</option>
                                </select>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.expRangeLabel}</label>
                                    <select value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectExp}</option>
                                        <option>0-1 years</option>
                                        <option>2-4 years</option>
                                        <option>5-7 years</option>
                                        <option>8+ years</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.salaryRangeLabel}</label>
                                    <select value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectSalary}</option>
                                        <option>$40k - $60k</option>
                                        <option>$60k - $90k</option>
                                        <option>$90k - $120k</option>
                                        <option>$120k+</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.locationLabel}</label>
                                    <input value={location} onChange={(e) => setLocation(e.target.value)}
                                        placeholder={t.ext.locationPlaceholder}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">{t.ext.contractTypeLabel}</label>
                                    <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">{t.ext.selectType}</option>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">{t.ext.keySkillsNotesLabel}</label>
                                <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={3}
                                    placeholder={t.ext.keySkillsNotesPlaceholder}
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                            </div>
                            {/* Task 4.2 — Job Description textarea */}
                            <div className="grid gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Job Description</label>
                                    <span className="rounded-full bg-recruiter/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-recruiter">
                                        Recommended
                                    </span>
                                </div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    rows={5}
                                    placeholder="Paste the full job description here — the AI will use it for precise matching instead of relying only on category labels..."
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60 resize-none"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Including the full JD gives the AI richer context and produces more accurate match scores.
                                </p>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button disabled={!canContinueFromStep1} onClick={() => setStep(2)}
                                className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg">
                                {t.ext.continueToCvs}
                            </button>
                        </div>
                    </div>
                    {/* Task 4.3 — Show JD preview in role summary panel */}
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
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                    {jobDescription.length > 120 ? `${jobDescription.slice(0, 120)}…` : jobDescription}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
                    <div className="space-y-6 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-recruiter" />
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">{t.ext.uploadTitleRecruiter}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{t.ext.uploadSubRecruiter}</p>

                        <label
                            htmlFor="cvFiles"
                            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                                uploading
                                    ? "border-recruiter/40 bg-recruiter/5 cursor-not-allowed"
                                    : "border-recruiter/60 bg-background/60 hover:border-recruiter hover:bg-recruiter/5"
                            }`}
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-8 w-8 text-recruiter" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-recruiter">
                                        Uploading {uploadingFileNames.length > 1 ? `${uploadingFileNames.length} files` : uploadingFileNames[0] ?? "file"}…
                                    </span>
                                    <span className="text-xs text-muted-foreground">Please wait</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-recruiter" />
                                    <span className="text-sm font-semibold text-foreground">{t.ext.uploadClickBrowse}</span>
                                    <span className="text-xs text-muted-foreground">{t.ext.uploadMaxFive}</span>
                                </>
                            )}
                        </label>
                        <input
                            ref={fileInputRef}
                            id="cvFiles"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            disabled={uploading}
                            onChange={handleFilesChange}
                        />

                        {selectedCvs.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{selectedCvs.length} {t.ext.filesSelected}</span>
                                    <button
                                        onClick={handleClearAll}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {t.ext.clearAll}
                                    </button>
                                </div>
                                {selectedCvs.map((cv, i) => (
                                    <div
                                        key={`${cv.id}-${i}`}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="h-4 w-4 text-recruiter flex-shrink-0" />
                                            <span className="font-medium text-foreground truncate">{cv.original_filename}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(i)}
                                            className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                                            title="Remove file"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {matchError && (
                            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-red-800">Matching failed</p>
                                    <p className="text-xs text-red-700 mt-0.5">{matchError}</p>
                                </div>
                                <button
                                    onClick={handleRetry}
                                    disabled={isRunning}
                                    className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="pt-2 flex gap-3">
                            <button onClick={() => setStep(1)} className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-secondary/60">
                                {t.ui.back}
                            </button>
                            <button
                                disabled={!canRunMatching}
                                onClick={handleRunMatching}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                {isRunning ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t.ext.analysingWait}
                                    </>
                                ) : (
                                    t.ext.runAiMatching
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground">{t.ext.whatHappensNext}</h3>
                        <p className="text-sm text-muted-foreground">{t.ext.whatHappensSub}</p>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li>{t.ext.happensPoint1}</li>
                            <li>{t.ext.happensPoint2}</li>
                            <li>{t.ext.happensPoint3}</li>
                        </ul>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    {/* Task 5: show skeleton while AI is running, real results after */}
                    {isRunning ? (
                        <ResultSkeleton />
                    ) : (
                        <>
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                                <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                    <div className="mb-4 flex items-center gap-3">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        <h3 className="font-serif text-2xl md:text-3xl text-foreground">{t.ext.bestMatchedCv}</h3>
                                    </div>
                                    {results.length > 0 && (
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-base font-semibold text-foreground">{results[0].file_name}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{results[0].reasons.overall_reason}</p>
                                                {results[0].reasons.strengths?.length > 0 && (
                                                    <ul className="mt-3 list-disc pl-5 text-xs text-emerald-700">
                                                        {results[0].reasons.strengths.map((item, i) => <li key={i}>{item}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-4xl font-bold text-recruiter">{results[0].match_score}</div>
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.ext.matchPer100}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                                    <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">{t.ext.jobOverview}</h3>
                                    <p className="text-sm text-muted-foreground">{jobDomain} · {experienceRange || t.ext.expNotSet} · {salaryRange || t.ext.salaryNotSet}</p>
                                    {(location || employmentType || skills) && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {[location, employmentType, skills && `${t.ext.skillsColon} ${skills}`].filter(Boolean).join(" · ")}
                                        </p>
                                    )}
                                    {jobDescription && (
                                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                                            "{jobDescription.slice(0, 100)}{jobDescription.length > 100 ? "…" : ""}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            {results.length > 1 && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {results.slice(1).map((r) => (
                                        <div key={r.cv_id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 group">
                                            <FileText className="mt-1 h-5 w-5 text-recruiter flex-shrink-0" />
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-foreground truncate">{r.file_name}</p>
                                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground flex-shrink-0">{r.match_score}/100</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{r.reasons.overall_reason}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFromResults(r.cv_id)}
                                                className="flex-shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                                                title={t.ext.removeCandidate}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Task 3: Export CSV button */}
                            <div className="flex gap-3 pt-2 flex-wrap">
                                <button onClick={() => { setStep(2); setMatchError(null); }} className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-secondary/60">
                                    {t.ext.backToCvs}
                                </button>
                                <button
                                    onClick={() => exportResultsToCSV(results)}
                                    className="inline-flex items-center gap-2 justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-secondary/60"
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </button>
                                <button onClick={handleReset} className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                                    {t.ext.startNewMatch}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
