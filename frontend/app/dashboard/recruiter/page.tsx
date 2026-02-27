"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    BarChart3,
    MessageSquare,
    Briefcase,
    SlidersHorizontal,
    Upload,
    CheckCircle2,
    FileText,
    ClipboardList,
    Star,
    AlertOctagon,
    ThumbsUp,
    HelpCircle,
} from "lucide-react";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import Protected from "@/components/Protected";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "candidates" | "analytics" | "chat" | "toolkit" | "jobs";

type MatchStep = 1 | 2 | 3;

interface MatchReason {
    overall_reason: string;
    strengths: string[];
    risks: string[];
}

interface ScorecardRow {
    competency: string;
    weight_pct: number;
    score: number; // 1-5
    notes: string;
}

interface HrToolkit {
    scorecard: ScorecardRow[];
    verification_questions: string[];
    red_flags: string[];
    recommended_decision: string;
}

interface MatchResult {
    cv_id: number;
    file_name: string;
    match_score: number;
    skills_match_score: number;
    experience_score: number;
    cv_quality_score: number;
    reasons: MatchReason;
    hr_toolkit?: HrToolkit | null;
}

interface SelectedCv {
    id: number;
    original_filename: string;
}

// ─── Decision badge colour helper ──────────────────────────────────────────────

function decisionStyle(text: string): string {
    const t = text.toLowerCase();
    if (t.includes("strongly")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (t.includes("recommend interviewing")) return "bg-blue-100 text-blue-800 border-blue-300";
    if (t.includes("borderline")) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
}

// ─── Star rating display ────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`h-4 w-4 ${
                        n <= score ? "fill-recruiter text-recruiter" : "fill-muted text-muted"
                    }`}
                />
            ))}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">{score}/5</span>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RecruiterDashboardPage() {
    const { user, email, accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>("candidates");
    const router = useRouter();

    const tabs = [
        { id: "candidates" as TabId, label: "Candidates", icon: Users },
        { id: "analytics" as TabId, label: "Analytics", icon: BarChart3 },
        { id: "chat" as TabId, label: "AI Assistant", icon: MessageSquare },
        { id: "toolkit" as TabId, label: "Interview Toolkit", icon: ClipboardList },
        { id: "jobs" as TabId, label: "Job Postings", icon: Briefcase },
    ];

    return (
        <Protected>
            <div className="min-h-screen bg-background font-sans text-foreground overflow-x-hidden">
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-recruiter/10 rounded-full blur-[100px] animate-blob mix-blend-multiply"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply"></div>
                </div>

                <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
                    <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="font-serif text-2xl font-medium tracking-tight">Pathwise</Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">{email || "Guest"}</span>
                            <span className="px-3 py-1 text-xs font-medium bg-recruiter/10 text-recruiter rounded-full">Recruiter</span>
                            <ProfileDropdown />
                        </div>
                    </div>
                </header>

                <div className="container mx-auto px-6 pt-32 pb-20">
                    <div className="mb-12">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-recruiter">
                            Recruiter Dashboard
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
                            Talent Management
                        </h1>
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

// ─── RecruiterMatchFlow ───────────────────────────────────────────────────────────

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
    const [focusedIndex, setFocusedIndex] = useState(0);

    const backendBaseUrl = "";

    const steps: { id: MatchStep; label: string }[] = [
        { id: 1, label: "Job details" },
        { id: 2, label: "Upload CVs" },
        { id: 3, label: "Results" },
    ];

    const canContinueFromStep1 = Boolean(jobDomain && experienceRange && salaryRange);
    const canRunMatching = selectedCvs.length > 0 && !isRunning;

    const handleFilesChange = async (event: any) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (!selectedFiles.length || !accessToken) return;

        const remainingSlots = 5 - selectedCvs.length;
        if (remainingSlots <= 0) {
            toast({
                variant: "destructive",
                title: "Limit reached",
                description: "You can only attach up to 5 CVs for one matching run.",
            });
            return;
        }

        setUploading(true);
        try {
            const toUpload = selectedFiles.slice(0, remainingSlots);
            for (const file of toUpload) {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(`${backendBaseUrl}/api/v1/cv/upload`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });

                if (res.status === 409) {
                    const existingRes = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, {
                        credentials: "include",
                    });
                    if (existingRes.ok) {
                        const existingList = (await existingRes.json()) as { id: number; original_filename: string }[];
                        const match = existingList.find((cv) => cv.original_filename === file.name);
                        if (match) {
                            setSelectedCvs((prev) => {
                                if (prev.find((cv) => cv.id === match.id)) return prev;
                                return [...prev, { id: match.id, original_filename: match.original_filename }].slice(0, 5);
                            });
                            continue;
                        }
                    }
                    const data = await res.json().catch(() => null);
                    throw new Error((data as any)?.detail ?? "Upload failed");
                }

                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error((data as any)?.detail ?? "Upload failed");
                }

                const created = (await res.json()) as { id: number; original_filename: string };
                setSelectedCvs((prev) => {
                    if (prev.find((cv) => cv.id === created.id)) return prev;
                    return [...prev, { id: created.id, original_filename: created.original_filename }].slice(0, 5);
                });
            }
        } catch (err: any) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: err?.message ?? "Something went wrong while uploading CVs.",
            });
        } finally {
            setUploading(false);
            if (event?.target) event.target.value = "";
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedCvs((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRunMatching = async () => {
        if (!selectedCvs.length || !accessToken) return;
        setIsRunning(true);
        setResults([]);

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
                const data = await res.json().catch(() => null);
                throw new Error((data as any)?.detail ?? "Matching failed");
            }

            const data = (await res.json()) as { results: MatchResult[] };
            setResults(data.results || []);
            setStep(3);
        } catch (err: any) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Matching failed",
                description: err?.message ?? "Could not run AI matching for these CVs.",
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSelectedCvs([]);
        setResults([]);
        setFocusedIndex(0);
    };

    const hasResults = results.length > 0;
    const safeIndex = Math.min(focusedIndex, Math.max(results.length - 1, 0));
    const focusedResult = hasResults ? results[safeIndex] : null;

    // ── Interview Toolkit tab ──────────────────────────────────────────────────

    if (activeTab === "toolkit") {
        return (
            <div className="space-y-8">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        Interview Toolkit
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
                        Structured interview guide
                    </h2>
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                        For each matched candidate you get a scored competency card, targeted questions, and a hiring recommendation — ready to use in the interview room.
                    </p>
                </div>

                {!hasResults && (
                    <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-10 text-center text-sm md:text-base text-muted-foreground">
                        Run a match in the <span className="font-semibold text-foreground">Candidates</span> tab first to unlock the Interview Toolkit.
                    </div>
                )}

                {hasResults && (
                    <>
                        {/* CV selector pills */}
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => {
                                const isActive = idx === safeIndex;
                                return (
                                    <button
                                        key={r.cv_id}
                                        onClick={() => setFocusedIndex(idx)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm font-semibold transition ${
                                            isActive
                                                ? "border-recruiter bg-recruiter text-white"
                                                : "border-border/60 bg-card/80 text-foreground hover:border-recruiter/70"
                                        }`}
                                    >
                                        <span className="truncate max-w-[140px] md:max-w-[220px]">{r.file_name}</span>
                                        <span className="text-[11px] md:text-xs opacity-80">{r.match_score}/100</span>
                                    </button>
                                );
                            })}
                        </div>

                        {focusedResult && (
                            <div className="space-y-6">

                                {/* ── Recommended decision banner ── */}
                                {focusedResult.hr_toolkit && (
                                    <div
                                        className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
                                            decisionStyle(focusedResult.hr_toolkit.recommended_decision)
                                        }`}
                                    >
                                        <ThumbsUp className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Hiring recommendation</p>
                                            <p className="mt-0.5 text-sm md:text-base font-semibold">
                                                {focusedResult.hr_toolkit.recommended_decision}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Scorecard table ── */}
                                {focusedResult.hr_toolkit?.scorecard && focusedResult.hr_toolkit.scorecard.length > 0 && (
                                    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-2">
                                            <ClipboardList className="h-5 w-5 text-recruiter" />
                                            <h3 className="font-serif text-xl md:text-2xl text-foreground">Competency Scorecard</h3>
                                        </div>
                                        <p className="mb-5 text-xs md:text-sm text-muted-foreground">
                                            Pre-filled from match data. Override scores during or after the interview.
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                                                        <th className="pb-3 pr-4 font-semibold">Competency</th>
                                                        <th className="pb-3 pr-4 font-semibold">Weight</th>
                                                        <th className="pb-3 pr-4 font-semibold">Pre-filled score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {focusedResult.hr_toolkit.scorecard.map((row, idx) => (
                                                        <tr key={idx} className="py-3">
                                                            <td className="py-3 pr-4 font-medium text-foreground">
                                                                {row.competency}
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className="rounded-full bg-recruiter/10 px-2.5 py-0.5 text-xs font-semibold text-recruiter">
                                                                    {row.weight_pct}%
                                                                </span>
                                                            </td>
                                                            <td className="py-3">
                                                                <StarRating score={row.score} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ── Verification questions ── */}
                                {focusedResult.hr_toolkit?.verification_questions &&
                                    focusedResult.hr_toolkit.verification_questions.length > 0 && (
                                    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-2">
                                            <HelpCircle className="h-5 w-5 text-recruiter" />
                                            <h3 className="font-serif text-xl md:text-2xl text-foreground">Interview Questions</h3>
                                        </div>
                                        <p className="mb-5 text-xs md:text-sm text-muted-foreground">
                                            Tailored to this candidate’s profile and the role. Use them to probe key gaps.
                                        </p>
                                        <ol className="space-y-4">
                                            {focusedResult.hr_toolkit.verification_questions.map((q, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-recruiter/10 text-xs font-bold text-recruiter">
                                                        {idx + 1}
                                                    </span>
                                                    <p className="pt-0.5 text-sm md:text-base text-foreground leading-relaxed">
                                                        {q}
                                                    </p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* ── Red flags ── */}
                                {focusedResult.hr_toolkit?.red_flags &&
                                    focusedResult.hr_toolkit.red_flags.length > 0 && (
                                    <div className="rounded-3xl border border-red-200 bg-red-50/60 p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-2">
                                            <AlertOctagon className="h-5 w-5 text-red-600" />
                                            <h3 className="font-serif text-xl md:text-2xl text-red-800">Red Flags</h3>
                                        </div>
                                        <p className="mb-4 text-xs md:text-sm text-red-700/80">
                                            These are signals to verify before making a hiring decision.
                                        </p>
                                        <ul className="space-y-3">
                                            {focusedResult.hr_toolkit.red_flags.map((flag, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"></span>
                                                    <p className="text-sm md:text-base text-red-800 leading-relaxed">
                                                        {flag}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* fallback when toolkit is missing */}
                                {!focusedResult.hr_toolkit && (
                                    <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-8 text-center text-sm text-muted-foreground">
                                        No toolkit data for this CV. Re-run the match to generate it.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    // ── Analytics tab ───────────────────────────────────────────────────────────

    if (activeTab === "analytics") {
        return (
            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                            Analytics Dashboard
                        </p>
                        <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
                            Compare candidates in depth
                        </h2>
                        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                            Select a CV to see how skills, experience and overall profile align with this role.
                        </p>
                    </div>
                </div>

                {!hasResults && (
                    <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-8 text-center text-sm md:text-base text-muted-foreground">
                        Run a match in the Candidates tab first to see analytics here.
                    </div>
                )}

                {hasResults && focusedResult && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => {
                                const isActive = idx === safeIndex;
                                return (
                                    <button
                                        key={r.cv_id}
                                        onClick={() => setFocusedIndex(idx)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm font-semibold transition ${
                                            isActive
                                                ? "border-recruiter bg-recruiter text-white"
                                                : "border-border/60 bg-card/80 text-foreground hover:border-recruiter/70"
                                        }`}
                                    >
                                        <span className="truncate max-w-[140px] md:max-w-[220px]">{r.file_name}</span>
                                        <span className="text-[11px] md:text-xs opacity-80">{r.match_score}/100</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                            <div className="space-y-5 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-serif text-xl md:text-2xl text-foreground">Match metrics</h3>
                                        <p className="mt-1 text-xs md:text-sm text-muted-foreground">
                                            Detailed scores for this CV against the current role.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl md:text-4xl font-bold text-recruiter">
                                            {focusedResult.match_score}
                                        </div>
                                        <div className="text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground">
                                            Overall match / 100
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[{
                                        label: "Domain fit",
                                        value: focusedResult.match_score,
                                        helper: "Overall score already includes domain fit weighting.",
                                    }, {
                                        label: "Skills match",
                                        value: focusedResult.skills_match_score,
                                        helper: "Overlap between job skills and CV skills.",
                                    }, {
                                        label: "Experience alignment",
                                        value: focusedResult.experience_score,
                                        helper: "Years of experience vs requested range.",
                                    }, {
                                        label: "CV quality",
                                        value: focusedResult.cv_quality_score,
                                        helper: "Structure, readability and richness of the CV.",
                                    }].map((metric) => (
                                        <div key={metric.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs md:text-sm font-medium text-foreground">
                                                <span>{metric.label}</span>
                                                <span>{metric.value}/100</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-recruiter transition-all duration-500"
                                                    style={{ width: `${Math.max(0, Math.min(100, metric.value))}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] md:text-xs text-muted-foreground">{metric.helper}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                                <h3 className="font-serif text-xl md:text-2xl text-foreground">Fit explanation</h3>
                                <p className="text-sm md:text-base text-muted-foreground">
                                    {focusedResult.reasons.overall_reason}
                                </p>
                                {focusedResult.reasons.strengths?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                                            Strengths
                                        </h4>
                                        <ul className="list-disc pl-5 text-xs md:text-sm text-emerald-700 space-y-1">
                                            {focusedResult.reasons.strengths.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {focusedResult.reasons.risks?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-amber-700 mb-1">
                                            Risks & gaps
                                        </h4>
                                        <ul className="list-disc pl-5 text-xs md:text-sm text-amber-700 space-y-1">
                                            {focusedResult.reasons.risks.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
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

    // ── Chat tab ─────────────────────────────────────────────────────────────

    if (activeTab === "chat") {
        return (
            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                            AI Interview Assistant
                        </p>
                        <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
                            Prepare smarter interview questions
                        </h2>
                        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                            Pick a CV to get tailored questions and focus points for your interview.
                        </p>
                    </div>
                </div>

                {!hasResults && (
                    <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-8 text-center text-sm md:text-base text-muted-foreground">
                        Run a match in the Candidates tab first to see interview suggestions here.
                    </div>
                )}

                {hasResults && focusedResult && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {results.map((r, idx) => {
                                const isActive = idx === safeIndex;
                                return (
                                    <button
                                        key={r.cv_id}
                                        onClick={() => setFocusedIndex(idx)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm font-semibold transition ${
                                            isActive
                                                ? "border-recruiter bg-recruiter text-white"
                                                : "border-border/60 bg-card/80 text-foreground hover:border-recruiter/70"
                                        }`}
                                    >
                                        <span className="truncate max-w-[140px] md:max-w-[220px]">{r.file_name}</span>
                                        <span className="text-[11px] md:text-xs opacity-80">{r.match_score}/100</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                            <div className="space-y-5 rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">Suggested questions</h3>
                                <div className="space-y-4 text-xs md:text-sm text-muted-foreground">
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">General fit</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>{`Walk me through your recent experience and how it relates to this ${jobDomain} role.`}</li>
                                            <li>"If you joined us in this position, what would you focus on in your first 90 days?"</li>
                                        </ul>
                                    </div>
                                    {focusedResult.reasons.strengths?.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-emerald-700 mb-1">Deep dive on strengths</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {focusedResult.reasons.strengths.map((s, idx) => (
                                                    <li key={idx}>{`You seem strong in "${s}". Can you share a specific project where you demonstrated this?`}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {focusedResult.reasons.risks?.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-amber-700 mb-1">Probe risks & gaps</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {focusedResult.reasons.risks.map((r, idx) => (
                                                    <li key={idx}>{`I noticed "${r}". Can you tell me more about this and how you handle it in your current work?`}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                                <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">Focus points</h3>
                                <p className="text-sm md:text-base text-muted-foreground">
                                    {jobDomain} · {experienceRange || "Experience not set"} · {salaryRange || "Salary not set"}
                                </p>
                                <ul className="mt-3 space-y-2 text-xs md:text-sm text-muted-foreground">
                                    {focusedResult.experience_score < 50 && (
                                        <li>Verify the candidate's real years of experience and seniority; the CV looks below the requested range.</li>
                                    )}
                                    {focusedResult.skills_match_score < 50 && (
                                        <li>Check hands-on level with the key skills for this role; the overlap with the job description seems limited.</li>
                                    )}
                                    {focusedResult.reasons.risks.slice(0, 2).map((r, idx) => (
                                        <li key={idx}>{r}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── Jobs tab ─────────────────────────────────────────────────────────────

    if (activeTab === "jobs") {
        return (
            <div className="bg-card rounded-3xl shadow-craft border border-border/40 min-h-[500px]">
                <div className="p-6 md:p-10 text-center py-20">
                    <Briefcase className="w-16 h-16 text-recruiter mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-serif font-bold mb-2">Job Postings</h2>
                    <p className="text-muted-foreground">Manage your job listings - Coming Soon</p>
                </div>
            </div>
        );
    }

    // ── Candidates tab (default: 3-step matching flow) ───────────────────────

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-recruiter/10 px-3 py-1 text-xs md:text-sm font-medium uppercase tracking-wide text-recruiter">
                        Recruiter workspace
                    </p>
                    <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
                        Match multiple CVs to one role
                    </h2>
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
                        <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 md:px-5 md:py-4 ${
                                isActive ? "border-recruiter bg-recruiter/5" : "border-border/60 bg-card/60"
                            }`}
                        >
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                    isActive
                                        ? "bg-recruiter text-white"
                                        : isCompleted
                                        ? "bg-emerald-500 text-white"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : item.id}
                            </div>
                            <div className="text-xs md:text-sm font-medium uppercase tracking-wide">
                                {item.label}
                            </div>
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
                                <select
                                    value={jobDomain}
                                    onChange={(e) => setJobDomain(e.target.value)}
                                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                >
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
                                    <select
                                        value={experienceRange}
                                        onChange={(e) => setExperienceRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                    >
                                        <option value="">Select experience</option>
                                        <option>0-1 years</option>
                                        <option>2-4 years</option>
                                        <option>5-7 years</option>
                                        <option>8+ years</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Salary range</label>
                                    <select
                                        value={salaryRange}
                                        onChange={(e) => setSalaryRange(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                    >
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
                                    <input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Remote, Paris, London..."
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-muted-foreground">Contract type</label>
                                    <select
                                        value={employmentType}
                                        onChange={(e) => setEmploymentType(e.target.value)}
                                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                    >
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
                                <textarea
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    rows={3}
                                    placeholder="Python, SQL, MLOps, stakeholder management..."
                                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm md:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-recruiter/60"
                                />
                            </div>
                        </div>
                        <div className="pt-2 flex flex-wrap gap-3">
                            <button
                                disabled={!canContinueFromStep1}
                                onClick={() => setStep(2)}
                                className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm md:text-base font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                Continue to CVs
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground mb-1">Role summary</h3>
                        <p className="text-sm md:text-base text-muted-foreground">
                            This is what the AI will see when scoring the CVs.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm md:text-base text-muted-foreground">
                            <li><span className="font-semibold text-foreground">Domain:</span> {jobDomain}</li>
                            <li><span className="font-semibold text-foreground">Experience:</span> {experienceRange || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Salary:</span> {salaryRange || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Location:</span> {location || "Not set yet"}</li>
                            <li><span className="font-semibold text-foreground">Contract:</span> {employmentType || "Not set yet"}</li>
                        </ul>
                        {skills && (
                            <div className="mt-3 text-sm md:text-base text-muted-foreground">
                                <span className="font-semibold text-foreground">Key skills:</span> {skills}
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
                            <h3 className="font-serif text-2xl md:text-3xl text-foreground">Upload up to 5 CVs</h3>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Drop CVs for this role. Supported formats: PDF, DOC, DOCX. Maximum five files per matching run.
                        </p>
                        <label
                            htmlFor="cvFiles"
                            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-recruiter/60 bg-background/60 px-6 py-10 text-center hover:border-recruiter hover:bg-recruiter/5"
                        >
                            <Upload className="h-8 w-8 text-recruiter" />
                            <span className="text-sm md:text-base font-semibold text-foreground">
                                {uploading ? "Uploading CVs..." : "Click to browse or drop CV files here"}
                            </span>
                            <span className="text-xs md:text-sm text-muted-foreground">
                                You can attach up to five CVs at once.
                            </span>
                        </label>
                        <input
                            id="cvFiles"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={handleFilesChange}
                        />
                        {selectedCvs.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                                    <span>{selectedCvs.length} file{selectedCvs.length > 1 ? "s" : ""} selected</span>
                                    <span>Maximum 5 CVs</span>
                                </div>
                                <div className="space-y-2">
                                    {selectedCvs.map((cv, index) => (
                                        <div
                                            key={cv.id + "-" + index}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs md:text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-recruiter" />
                                                <span className="font-medium text-foreground truncate max-w-[160px] md:max-w-[260px]">
                                                    {cv.original_filename}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="pt-2 flex flex-wrap gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm md:text-base font-semibold text-foreground hover:bg-secondary/60"
                            >
                                Back to job details
                            </button>
                            <button
                                disabled={!canRunMatching}
                                onClick={handleRunMatching}
                                className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm md:text-base font-semibold text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                {isRunning ? "Matching..." : "Run AI matching"}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-3xl border border-dashed border-recruiter/40 bg-recruiter/5 p-6 md:p-8">
                        <h3 className="font-serif text-xl md:text-2xl text-foreground mb-1">What happens next</h3>
                        <p className="text-sm md:text-base text-muted-foreground">
                            The backend will compare each CV with the role you defined, then score and comment on every profile so you can justify why it fits.
                        </p>
                        <ul className="mt-3 space-y-2 text-sm md:text-base text-muted-foreground">
                            <li>We extract the text and structure of each CV.</li>
                            <li>We look for skills, experience and domain fit with your job.</li>
                            <li>You receive a match score and a short explanation per CV.</li>
                        </ul>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                        <div className="space-y-4">
                            <div className="rounded-3xl border border-border/60 bg-card/80 p-6 md:p-8">
                                <div className="mb-4 flex items-center gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    <h3 className="font-serif text-2xl md:text-3xl text-foreground">Best matched CV</h3>
                                </div>
                                {results.length > 0 && (
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-base md:text-lg font-semibold text-foreground">
                                                {results[0].file_name}
                                            </p>
                                            <p className="mt-1 text-sm md:text-base text-muted-foreground">
                                                {results[0].reasons.overall_reason}
                                            </p>
                                            {(results[0].reasons.strengths?.length || 0) > 0 && (
                                                <ul className="mt-3 list-disc pl-5 text-xs md:text-sm text-emerald-700">
                                                    {results[0].reasons.strengths.map((item, idx) => (
                                                        <li key={idx}>{item}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {(results[0].reasons.risks?.length || 0) > 0 && (
                                                <ul className="mt-2 list-disc pl-5 text-xs md:text-sm text-amber-700">
                                                    {results[0].reasons.risks.map((item, idx) => (
                                                        <li key={idx}>{item}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-4xl md:text-5xl font-bold text-recruiter">
                                                {results[0].match_score}
                                            </div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                Match score / 100
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 md:p-8">
                            <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">Job overview</h3>
                            <p className="text-sm md:text-base text-muted-foreground">
                                {jobDomain} · {experienceRange || "Experience not set"} · {salaryRange || "Salary not set"}
                            </p>
                            {(location || employmentType || skills) && (
                                <p className="mt-1 text-xs md:text-sm text-muted-foreground">
                                    {location && `${location} · `}
                                    {employmentType}
                                    {skills && ` · Skills: ${skills}`}
                                </p>
                            )}
                        </div>
                    </div>
                    {results.length > 1 && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {results.slice(1).map((result) => (
                                <div
                                    key={result.cv_id}
                                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-4"
                                >
                                    <FileText className="mt-1 h-5 w-5 text-recruiter" />
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm md:text-base font-semibold text-foreground">
                                                {result.file_name}
                                            </p>
                                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                                {result.match_score}/100
                                            </span>
                                        </div>
                                        <p className="text-xs md:text-sm text-muted-foreground">
                                            {result.reasons.overall_reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            onClick={() => setStep(2)}
                            className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-5 py-2 text-sm md:text-base font-semibold text-foreground hover:bg-secondary/60"
                        >
                            Back to CVs
                        </button>
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center justify-center rounded-full bg-recruiter px-6 py-2.5 text-sm md:text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            Start a new match
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
