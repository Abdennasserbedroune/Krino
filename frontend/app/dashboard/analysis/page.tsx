"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import {
    CheckCircle,
    AlertTriangle,
    Lightbulb,
    Target,
    FileText,
    Zap,
    Search,
    ShieldCheck,
    LayoutGrid,
    ChevronDown,
    ChevronUp,
    Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CvItem {
    id: number;
    original_filename: string;
    score: number | null;
    analysis_result: {
        overall_score?: number;
        strengths?: string[];
        weaknesses?: string[];
        recommendations?: string[];
        interview_prep_questions?: string[];
    } | null;
    suggestions: {
        strengths?: string[];
        weaknesses?: string[];
        recommendations?: string[];
        interview_prep_questions?: string[];
    } | null;
    analyzed_at: string | null;
}

interface ChecklistItem {
    priority: "high" | "medium" | "low";
    text: string;
    done: boolean;
}

interface SectionHealth {
    contact: "ok" | "warn" | "missing";
    summary: "ok" | "warn" | "missing";
    experience: "ok" | "warn" | "missing";
    education: "ok" | "warn" | "missing";
    skills: "ok" | "warn" | "missing";
}

interface ActionPlan {
    score: number;
    score_band: "strong" | "good" | "fair" | "weak";
    fix_checklist: ChecklistItem[];
    ats_keyword_gaps: string[];
    proof_prompts: string[];
    section_health: SectionHealth;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const HEALTH_STYLES: Record<string, { bar: string; label: string }> = {
    ok: { bar: "bg-emerald-500", label: "Good" },
    warn: { bar: "bg-amber-400", label: "Weak" },
    missing: { bar: "bg-red-500", label: "Missing" },
};

const SCORE_BAND_LABEL: Record<string, string> = {
    strong: "Strong CV",
    good: "Good CV",
    fair: "Needs Work",
    weak: "Needs Major Fixes",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalysisPage() {
    const { accessToken } = useAuth();
    const [cvs, setCvs] = useState<CvItem[]>([]);
    const [selectedCv, setSelectedCv] = useState<CvItem | null>(null);
    const [loading, setLoading] = useState(false);

    // Action Plan state
    const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

    const router = useRouter();
    const backendBaseUrl = "";

    useEffect(() => {
        if (!accessToken) {
            router.push("/auth/sign-in");
            return;
        }
        void fetchCvs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    // Reset plan when CV changes
    useEffect(() => {
        setActionPlan(null);
        setPlanOpen(false);
        setChecklist([]);
    }, [selectedCv?.id]);

    async function fetchCvs() {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Unable to load CVs");
            const data = (await res.json()) as CvItem[];
            const analyzedCvs = data.filter((cv) => cv.analyzed_at || cv.score !== null);
            setCvs(analyzedCvs);
            if (analyzedCvs.length > 0) setSelectedCv(analyzedCvs[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleFixMyCv(cvId: number) {
        if (planOpen && actionPlan) {
            // Toggle close
            setPlanOpen(false);
            return;
        }
        if (actionPlan) {
            // Already loaded, just open
            setPlanOpen(true);
            return;
        }
        setPlanLoading(true);
        setPlanOpen(false);
        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/${cvId}/action-plan`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load action plan");
            const data = (await res.json()) as ActionPlan;
            setActionPlan(data);
            setChecklist(data.fix_checklist.map((item) => ({ ...item })));
            setPlanOpen(true);
        } catch (err) {
            console.error(err);
        } finally {
            setPlanLoading(false);
        }
    }

    function toggleChecklistItem(idx: number) {
        setChecklist((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, done: !item.done } : item))
        );
    }

    // ── Loading / Empty states ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center gap-3 border-2 border-foreground bg-background p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Loading analysis...
                </p>
            </div>
        );
    }

    if (cvs.length === 0) {
        return (
            <div className="border-2 border-dashed border-foreground bg-background/50 p-12 text-center">
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-foreground bg-secondary">
                    <FileText className="h-8 w-8 text-foreground" />
                </div>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    No analyzed CVs yet. Upload and analyze a CV in the Upload tab to see results here.
                </p>
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">

                {/* ── Sidebar: CV List ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-7 bg-primary"></div>
                        <h2 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                            Analyzed CVs
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {cvs.map((cv) => (
                            <button
                                key={cv.id}
                                onClick={() => setSelectedCv(cv)}
                                className={`w-full border-2 border-foreground p-4 text-left transition-all ${
                                    selectedCv?.id === cv.id
                                        ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        : "bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                }`}
                            >
                                <p className="truncate text-base font-bold uppercase tracking-tight">
                                    {cv.original_filename}
                                </p>
                                <p className="text-sm font-medium uppercase tracking-widest opacity-80">
                                    Score: {cv.score ?? "N/A"}/100
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main: Analysis Detail ── */}
                {selectedCv && (
                    <div className="space-y-6">

                        {/* Score Card + Fix My CV button */}
                        <div className="border-2 border-foreground bg-card p-7 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="font-serif text-2xl font-bold uppercase tracking-tight text-foreground">
                                        {selectedCv.original_filename}
                                    </h3>
                                    <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                        Analysis Results
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-2 border-2 border-foreground bg-primary px-7 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="font-serif text-3xl font-bold text-primary-foreground">
                                        {selectedCv.score ?? "N/A"}
                                    </span>
                                    <span className="text-base font-bold uppercase tracking-widest text-primary-foreground">
                                        /100
                                    </span>
                                </div>
                            </div>

                            {/* ── Fix My CV button ── */}
                            <button
                                onClick={() => void handleFixMyCv(selectedCv.id)}
                                disabled={planLoading}
                                className="inline-flex items-center gap-2 border-2 border-foreground bg-accent px-7 py-3 text-base font-bold uppercase tracking-widest text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {planLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : planOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <Zap className="h-4 w-4" />
                                )}
                                {planLoading
                                    ? "Loading..."
                                    : planOpen
                                    ? "Hide Fix Plan"
                                    : "Fix My CV"}
                            </button>
                        </div>

                        {/* ── ACTION PLAN PANEL (shown when planOpen) ── */}
                        {planOpen && actionPlan && (
                            <div className="space-y-5">

                                {/* Plan header */}
                                <div className="flex items-center gap-3 border-2 border-foreground bg-primary px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <Zap className="h-5 w-5 text-primary-foreground" />
                                    <div>
                                        <p className="text-base font-bold uppercase tracking-widest text-primary-foreground">
                                            Fix My CV — Your Personal Action Plan
                                        </p>
                                        <p className="text-xs font-medium text-primary-foreground/70">
                                            {SCORE_BAND_LABEL[actionPlan.score_band]} · {actionPlan.score}/100
                                        </p>
                                    </div>
                                </div>

                                {/* ── Card 1: Section Health ── */}
                                <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
                                            <LayoutGrid className="h-5 w-5 text-foreground" />
                                        </div>
                                        <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                            CV Health Check
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                                        {Object.entries(actionPlan.section_health).map(([section, status]) => {
                                            const style = HEALTH_STYLES[status] ?? HEALTH_STYLES["missing"];
                                            return (
                                                <div
                                                    key={section}
                                                    className="flex flex-col items-center gap-2 border-2 border-foreground p-3"
                                                >
                                                    <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                                                        {section}
                                                    </p>
                                                    <div className="h-1.5 w-full rounded-full bg-muted">
                                                        <div
                                                            className={`h-full rounded-full ${style.bar}`}
                                                            style={{
                                                                width:
                                                                    status === "ok"
                                                                        ? "100%"
                                                                        : status === "warn"
                                                                        ? "50%"
                                                                        : "15%",
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[
                                                            status === "ok"
                                                                ? "low"
                                                                : status === "warn"
                                                                ? "medium"
                                                                : "high"
                                                        ]}`}
                                                    >
                                                        {style.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── Card 2: Fix-It Checklist ── */}
                                {checklist.length > 0 && (
                                    <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="mb-5 flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-accent">
                                                <ShieldCheck className="h-5 w-5 text-accent-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                                    Fix-It Checklist
                                                </h3>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {checklist.filter((i) => i.done).length}/{checklist.length} completed
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-5 h-2 w-full rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${Math.round(
                                                        (checklist.filter((i) => i.done).length /
                                                            checklist.length) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>

                                        <ul className="space-y-3">
                                            {checklist.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    className={`flex items-start gap-3 rounded-none border-2 border-foreground p-3 transition-all ${
                                                        item.done ? "opacity-50" : ""
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() => toggleChecklistItem(idx)}
                                                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 border-foreground transition-colors ${
                                                            item.done ? "bg-primary" : "bg-background"
                                                        }`}
                                                    >
                                                        {item.done && (
                                                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                                                        )}
                                                    </button>
                                                    <div className="flex-1">
                                                        <span
                                                            className={`text-sm font-medium leading-relaxed text-foreground ${
                                                                item.done ? "line-through" : ""
                                                            }`}
                                                        >
                                                            {item.text}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`mt-0.5 rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${
                                                            PRIORITY_STYLES[item.priority]
                                                        }`}
                                                    >
                                                        {item.priority}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* ── Card 3: Missing Keywords ── */}
                                {actionPlan.ats_keyword_gaps.length > 0 && (
                                    <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="mb-5 flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary">
                                                <Search className="h-5 w-5 text-primary-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                                    Missing Keywords
                                                </h3>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Add these to pass ATS filters
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {actionPlan.ats_keyword_gaps.map((kw, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-none border-2 border-foreground bg-accent px-3 py-1 text-sm font-bold uppercase tracking-wide text-accent-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                >
                                                    + {kw}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="mt-4 text-xs font-medium text-muted-foreground">
                                            Add these keywords naturally in your Skills, Summary, or Experience sections.
                                        </p>
                                    </div>
                                )}

                                {/* ── Card 4: Prove Your Value ── */}
                                {actionPlan.proof_prompts.length > 0 && (
                                    <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="mb-5 flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
                                                <Target className="h-5 w-5 text-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                                    Prove Your Value
                                                </h3>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Add these details to your CV to stand out
                                                </p>
                                            </div>
                                        </div>
                                        <ul className="space-y-3">
                                            {actionPlan.proof_prompts.map((prompt, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary text-xs font-bold text-foreground">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm font-medium leading-relaxed text-foreground">
                                                        {prompt}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Existing: Strengths ── */}
                        {(selectedCv.suggestions?.strengths || selectedCv.analysis_result?.strengths) && (
                            <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary">
                                        <CheckCircle className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                    <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                        Strengths
                                    </h3>
                                </div>
                                <ul className="space-y-3">
                                    {(
                                        selectedCv.suggestions?.strengths ||
                                        selectedCv.analysis_result?.strengths ||
                                        []
                                    ).map((strength, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 h-2 w-2 flex-shrink-0 border-2 border-foreground bg-primary"></div>
                                            <span className="text-base font-medium leading-relaxed text-foreground">
                                                {strength}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Existing: Weaknesses ── */}
                        {(selectedCv.suggestions?.weaknesses || selectedCv.analysis_result?.weaknesses) && (
                            <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-accent">
                                        <AlertTriangle className="h-5 w-5 text-accent-foreground" />
                                    </div>
                                    <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                        Weaknesses
                                    </h3>
                                </div>
                                <ul className="space-y-3">
                                    {(
                                        selectedCv.suggestions?.weaknesses ||
                                        selectedCv.analysis_result?.weaknesses ||
                                        []
                                    ).map((weakness, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 h-2 w-2 flex-shrink-0 border-2 border-foreground bg-accent"></div>
                                            <span className="text-sm font-medium leading-relaxed text-foreground">
                                                {weakness}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Existing: Recommendations ── */}
                        {(selectedCv.suggestions?.recommendations ||
                            selectedCv.analysis_result?.recommendations) && (
                            <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
                                        <Lightbulb className="h-5 w-5 text-foreground" />
                                    </div>
                                    <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                        Recommendations
                                    </h3>
                                </div>
                                <ul className="space-y-3">
                                    {(
                                        selectedCv.suggestions?.recommendations ||
                                        selectedCv.analysis_result?.recommendations ||
                                        []
                                    ).map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 h-2 w-2 flex-shrink-0 border-2 border-foreground bg-secondary"></div>
                                            <span className="text-base font-medium leading-relaxed text-foreground">
                                                {rec}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Existing: Interview Prep Questions ── */}
                        {(selectedCv.suggestions?.interview_prep_questions ||
                            selectedCv.analysis_result?.interview_prep_questions) && (
                            <div className="border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary">
                                        <Target className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                    <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                        Interview Prep Questions
                                    </h3>
                                </div>
                                <ul className="space-y-3">
                                    {(
                                        selectedCv.suggestions?.interview_prep_questions ||
                                        selectedCv.analysis_result?.interview_prep_questions ||
                                        []
                                    ).map((question, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground">
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm font-medium leading-relaxed text-foreground">
                                                {question}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
