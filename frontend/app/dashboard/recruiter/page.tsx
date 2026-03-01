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
} from "lucide-react";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import Protected from "@/components/Protected";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterDashboardPage() {
    const { email, accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>("candidates");

    const tabs = [
        { id: "candidates" as TabId, label: "Candidates", icon: Users },
        { id: "analytics" as TabId, label: "Analytics", icon: BarChart3 },
        { id: "yourtoolkit" as TabId, label: "Your Toolkit", icon: Sparkles },
        { id: "jobs" as TabId, label: "Job Postings", icon: Briefcase },
    ];

    return (
        <Protected>
            <div className="min-h-screen bg-background font-sans text-foreground overflow-x-hidden">
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-recruiter/10 rounded-full blur-[100px] animate-blob mix-blend-multiply" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply" />
                </div>

                {/* ── Fixed Header (Aligned with Job Seeker Header) ── */}
                <header className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-recruiter/95 via-orange-600/95 to-red-600/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
                    <div className="container mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            {/* Non-clickable logo */}
                            <span className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white select-none cursor-default">
                                Pathwise
                            </span>
                            <span className="hidden md:inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-50 whitespace-nowrap">
                                Recruiter
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
                            Recruiter Dashboard
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Talent Management</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl">
                            Screen candidates, analyze resumes, and match multiple CVs to the role you need to fill.
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
    const [step, setStep] = useState<MatchStep>(1);
    const [jobDomain, setJobDomain] = useState("AI & Data");
    const [experienceRange, setExperienceRange] = useState("");
    const [salaryRange, setSalaryRange] = useState("");
    const [location, setLocation] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [skills, setSkills] = useState("");
    const [selectedCvs, setSelectedCvs] = useState<SelectedCv[]>([]);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([]);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const backendBaseUrl = "";

    const steps: { id: MatchStep; label: string }[] = [
        { id: 1, label: "Job details" },
        { id: 2, label: "Upload CVs" },
        { id: 3, label: "Results" },
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
        try {
            const payload = {
                job: {
                    domain: jobDomain,
                    experience_range: experienceRange,
                    salary_range: salaryRange,
                    location,
                    contract_type: employmentType,
                    skills_text: skills,
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
            setStep(3);
        } catch (err: any) {
            const msg = err?.message ?? "Could not run AI matching.";
            setMatchError(msg);
            toast({ variant: "destructive", title: "Matching failed", description: msg });
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
                        <Sparkles className="h-3.5 w-3.5" /> AI-Powered
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">Your Toolkit</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        Everything you need to make a confident hiring decision — hiring verdict, score breakdown, tailored interview questions, and red flags — all in one place.
                    </p>
                </div>

                {!hasResults && (
                    <div className="rounded-3xl border-2 border-dashed border-recruiter/30 bg-recruiter/5 p-14 text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-recruiter/40 mb-4" />
                        <p className="text-lg font-semibold text-foreground">No candidates yet</p>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                            Go to the <span className="font-semibold text-foreground">Candidates</span> tab, define the role, upload CVs and run the AI match. Your full toolkit will appear here instantly.
                        </p>
                    </div>
                )}

                {hasResults && (
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
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">AI Hiring Verdict</p>
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
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">Score Breakdown</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
                                        <ScoreRing value={focusedResult.match_score} label="Overall Match" color="var(--color-recruiter, #f97316)" />
                                        <ScoreRing value={focusedResult.skills_match_score} label="Skills" color="#3b82f6" />
                                        <ScoreRing value={focusedResult.experience_score} label="Experience" color="#8b5cf6" />
                                        <ScoreRing value={focusedResult.cv_quality_score} label="CV Quality" color="#10b981" />
                                    </div>
                                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                                        {[
                                            { label: "Overall Match", value: focusedResult.match_score, color: "bg-recruiter" },
                                            { label: "Skills Match", value: focusedResult.skills_match_score, color: "bg-blue-500" },
                                            { label: "Experience", value: focusedResult.experience_score, color: "bg-violet-500" },
                                            { label: "CV Quality", value: focusedResult.cv_quality_score, color: "bg-emerald-500" },
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
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">AI Interview Questions</h3>
                                    </div>
                                    <p className="mb-6 text-xs md:text-sm text-muted-foreground">
                                        Generated from this candidate&apos;s profile and the role. Click the copy icon to grab any question.
                                    </p>

                                    <div className="space-y-5">
                                        {/* General */}
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <Target className="h-4 w-4 text-foreground/60" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">General Fit</span>
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
                                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Explore Strengths</span>
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
                                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Probe the Gaps</span>
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
                                            <h3 className="font-serif text-xl md:text-2xl text-red-800">Red Flags to Verify</h3>
                                        </div>
                                        <p className="mb-5 text-xs md:text-sm text-red-700/80">
                                            These signals came up during the AI analysis. Dig into them before making your decision.
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

                                {/* ── 5. CANDIDATE COMPARISON TABLE ── */}
                                {results.length > 1 && (
                                    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-recruiter" />
                                            <h3 className="font-serif text-xl md:text-2xl text-foreground">All Candidates at a Glance</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                                                        <th className="pb-3 pr-3 font-semibold">Candidate</th>
                                                        <th className="pb-3 pr-3 font-semibold">Overall</th>
                                                        <th className="pb-3 pr-3 font-semibold">Skills</th>
                                                        <th className="pb-3 pr-3 font-semibold">Exp.</th>
                                                        <th className="pb-3 font-semibold">Verdict</th>
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
                        Analytics Dashboard
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">Compare candidates in depth</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        Select a CV to see how skills, experience and overall profile align with this role.
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
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">Match metrics</h3>
                                        <p className="mt-1 text-xs md:text-sm text-muted-foreground">Detailed scores for this CV against the current role.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl md:text-4xl font-bold text-recruiter">{focusedResult.match_score}</div>
                                        <div className="text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground">Overall match / 100</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: "Domain fit", value: focusedResult.match_score, helper: "Overall score already includes domain fit weighting." },
                                        { label: "Skills match", value: focusedResult.skills_match_score, helper: "Overlap between job skills and CV skills." },
                                        { label: "Experience alignment", value: focusedResult.experience_score, helper: "Years of experience vs requested range." },
                                        { label: "CV quality", value: focusedResult.cv_quality_score, helper: "Structure, readability and richness of the CV." },
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
                                <h3 className="font-serif text-xl md:text-2xl text-foreground">Fit explanation</h3>
                                <p className="text-sm md:text-base text-muted-foreground">{focusedResult.reasons.overall_reason}</p>
                                {focusedResult.reasons.strengths?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-1">Strengths</h4>
                                        <ul className="list-disc pl-5 text-xs md:text-sm text-emerald-700 space-y-1">
                                            {focusedResult.reasons.strengths.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {focusedResult.reasons.risks?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-amber-700 mb-1">Risks & gaps</h4>
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
                    <h2 className="text-2xl font-serif font-bold mb-2">Job Postings</h2>
                    <p className="text-muted-foreground">Manage your job listings — Coming Soon</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        Recruiter workspace
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">Match multiple CVs to one role</h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        First describe the job, then upload up to five CVs. The AI will highlight which profiles fit best and why.
                    </p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-xs md:text-sm text-muted-foreground max-w-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <SlidersHorizontal className="h-4 w-4 text-recruiter" />
                        Quick matching flow
                    </div>
                    <p className="mt-1">Step 1: Job details · Step 2: Upload CVs · Step 3: AI match summary.</p>
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
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">Define the role</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">Job domain</label>
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
                                    <label className="text-sm font-medium text-muted-foreground">Experience range</label>
                                    <select value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">Select experience</option>
                                        <option>0-1 years</option>
                                        <option>2-4 years</option>
                                        <option>5-7 years</option>
                                        <option>8+ years</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Salary range</label>
                                    <select value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">Select salary</option>
                                        <option>$40k - $60k</option>
                                        <option>$60k - $90k</option>
                                        <option>$90k - $120k</option>
                                        <option>$120k+</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                                    <input value={location} onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Remote, Paris, London..."
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Contract type</label>
                                    <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60">
                                        <option value="">Select type</option>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">Key skills or notes</label>
                                <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={3}
                                    placeholder="Python, SQL, MLOps, stakeholder management..."
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60" />
                            </div>
                        </div>
                        <div className="pt-2">
                            <button disabled={!canContinueFromStep1} onClick={() => setStep(2)}
                                className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg">
                                Continue to CVs
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground">Role summary</h3>
                        <p className="text-sm text-muted-foreground">This is what the AI will see when scoring the CVs.</p>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li><span className="font-semibold text-foreground">Domain:</span> {jobDomain}</li>
                            <li><span className="font-semibold text-foreground">Experience:</span> {experienceRange || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Salary:</span> {salaryRange || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Location:</span> {location || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Contract:</span> {employmentType || "Not set yet"}</li>
                        </ul>
                        {skills && <p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Key skills:</span> {skills}</p>}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
                    <div className="space-y-6 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-recruiter" />
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">Upload up to 5 CVs</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Supported formats: PDF, DOC, DOCX. Maximum five files per matching run.</p>

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
                                    <span className="text-sm font-semibold text-foreground">Click to browse or drop CV files here</span>
                                    <span className="text-xs text-muted-foreground">You can attach up to five CVs at once.</span>
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
                                    <span>{selectedCvs.length} file{selectedCvs.length > 1 ? "s" : ""} selected</span>
                                    <button
                                        onClick={handleClearAll}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Clear all
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
                                Back
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
                                        Matching…
                                    </>
                                ) : (
                                    "Run AI matching"
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground">What happens next</h3>
                        <p className="text-sm text-muted-foreground">The backend compares each CV to your role, then scores and explains every profile.</p>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li>We extract text and structure from each CV.</li>
                            <li>We check skills, experience and domain fit.</li>
                            <li>You get a score and explanation per CV — instantly.</li>
                        </ul>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                            <div className="mb-4 flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                <h3 className="font-serif text-2xl md:text-3xl text-foreground">Best matched CV</h3>
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
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Match / 100</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                            <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">Job overview</h3>
                            <p className="text-sm text-muted-foreground">{jobDomain} · {experienceRange || "Exp. not set"} · {salaryRange || "Salary not set"}</p>
                            {(location || employmentType || skills) && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {[location, employmentType, skills && `Skills: ${skills}`].filter(Boolean).join(" · ")}
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
                                        title="Remove candidate"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => { setStep(2); setMatchError(null); }} className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-secondary/60">
                            Back to CVs
                        </button>
                        <button onClick={handleReset} className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                            Start a new match
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
