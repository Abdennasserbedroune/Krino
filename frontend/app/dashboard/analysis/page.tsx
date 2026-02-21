"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Download, CheckCircle, AlertTriangle, Lightbulb, Target, FileText } from "lucide-react";

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

export default function AnalysisPage() {
    const { accessToken } = useAuth();
    const [cvs, setCvs] = useState<CvItem[]>([]);
    const [selectedCv, setSelectedCv] = useState<CvItem | null>(null);
    const [loading, setLoading] = useState(false);
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

    async function fetchCvs() {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("Unable to load CVs");
            }
            const data = (await res.json()) as CvItem[];
            // Filter analyzed CVs (either local analysis or AI review)
            const analyzedCvs = data.filter((cv) => cv.analyzed_at || cv.score !== null);
            setCvs(analyzedCvs);
            if (analyzedCvs.length > 0) {
                setSelectedCv(analyzedCvs[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleDownloadPdf = async (cvId: number) => {
        if (!accessToken) return;

        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/${cvId}/pdf?template=classic`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!res.ok) {
                throw new Error("Download failed");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cv_${cvId}_improved.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
        }
    };

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

    return (
        <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                {/* CV List Sidebar - Brutalist */}
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
                                className={`w-full border-2 border-foreground p-4 text-left transition-all ${selectedCv?.id === cv.id
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

                {/* Analysis Details - Brutalist */}
                {selectedCv && (
                    <div className="space-y-6">
                        {/* Score Card */}
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
                            <button
                                onClick={() => handleDownloadPdf(selectedCv.id)}
                                className="inline-flex items-center gap-2 border-2 border-foreground bg-accent px-7 py-3 text-base font-bold uppercase tracking-widest text-accent-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <Download className="h-4 w-4" />
                                Download Improved CV
                            </button>
                        </div>

                        {/* Strengths */}
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

                        {/* Weaknesses */}
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

                        {/* Recommendations */}
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

                        {/* Interview Prep Questions */}
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
