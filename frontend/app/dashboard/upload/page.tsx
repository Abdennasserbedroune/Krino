"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Upload, FileText, Sparkles, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Modal } from "@/components/ui/modal";

interface CvItem {
    id: number;
    original_filename: string;
    file_type: string;
    file_size: number;
    score: number | null;
    analyzed_at: string | null;
}

export default function UploadPage() {
    const { user, accessToken } = useAuth();
    const { toast: showToast } = useToast();
    const [cvs, setCvs] = useState<CvItem[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<string>("");
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showProModal, setShowProModal] = useState(false);
    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

    useEffect(() => {
        if (!user) {
            router.push("/auth/sign-in");
            return;
        }
        void fetchCvs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function fetchCvs() {
        if (!user) return;
        setLoadingList(true);
        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, {
                headers: {
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
            });
            if (!res.ok) {
                throw new Error("Unable to load CVs");
            }
            const data = (await res.json()) as CvItem[];
            setCvs(data);
        } catch (err: any) {
            console.error(err);
            showToast({
                variant: "destructive",
                title: "Failed to load CVs",
                description: err?.message ?? "Unable to load CVs.",
            });
        } finally {
            setLoadingList(false);
        }
    }

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (cvs.length >= 3) {
            setShowProModal(true);
            if (event.target) event.target.value = "";
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStage("Uploading file...");

        // Simulate progress for a "believable" feel
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev < 30) return prev + 2; // Fast upload simulation
                if (prev < 60) {
                    setUploadStage("Indexing data...");
                    return prev + 1;
                }
                if (prev < 90) {
                    setUploadStage("Extracting informations...");
                    return prev + 0.5; // Slow down for parsing
                }
                return prev;
            });
        }, 200);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${backendBaseUrl}/api/v1/cv/upload`, {
                method: "POST",
                headers: {
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                const detail = (data as any)?.detail ?? "Upload failed";
                throw new Error(detail);
            }

            // Finish progress
            setUploadProgress(100);
            setUploadStage("Complete!");

            const created = (await res.json()) as CvItem;

            // Short delay to show 100%
            setTimeout(() => {
                setCvs((prev) => [created, ...prev]);
                showToast({
                    title: "CV uploaded",
                    description: "Your CV was uploaded and processed successfully.",
                });
                setUploading(false);
                setUploadProgress(0);
                setUploadStage("");
            }, 500);

            event.target.value = "";
        } catch (err: any) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            showToast({
                variant: "destructive",
                title: "Upload failed",
                description: err?.message ?? "Something went wrong while uploading.",
            });
        } finally {
            clearInterval(progressInterval);
        }
    };

    const handleAnalyze = async (cvId: number) => {
        if (!user) return;

        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/${cvId}/analyze`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!res.ok) {
                throw new Error("Analysis failed");
            }

            const updated = (await res.json()) as CvItem;
            setCvs((prev) => prev.map((cv) => (cv.id === cvId ? updated : cv)));
            showToast({
                title: "Analysis complete",
                description: "Your CV has been analyzed successfully.",
            });
        } catch (err: any) {
            showToast({
                variant: "destructive",
                title: "Analysis failed",
                description: err?.message ?? "Could not analyze this CV.",
            });
        }
    };

    const confirmDelete = async () => {
        if (!user || deleteId === null) return;

        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/${deleteId}`, {
                method: "DELETE",
                headers: {
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
            });

            if (!res.ok) {
                throw new Error("Delete failed");
            }

            setCvs((prev) => prev.filter((cv) => cv.id !== deleteId));
            showToast({
                title: "CV deleted",
                description: "The CV has been removed from your list.",
            });
            setDeleteId(null);
        } catch (err: any) {
            showToast({
                variant: "destructive",
                title: "Delete failed",
                description: err?.message ?? "Could not delete this CV.",
            });
        }
    };

    return (
        <div className="space-y-8">
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete CV"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-red-50/50 rounded-2xl border border-red-100">
                        <Trash2 className="h-12 w-12 text-red-500 mb-2" />
                        <p className="text-base font-semibold text-red-900">Confirm Deletion</p>
                    </div>
                    <p className="text-center text-sm text-foreground/80 leading-relaxed px-2">
                        Are you sure you want to delete <span className="font-bold text-foreground">"{cvs.find(c => c.id === deleteId)?.original_filename}"</span>? <br />
                        This action is permanent and cannot be undone.
                    </p>
                    <div className="flex justify-stretch gap-3 pt-2">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="flex-1 px-4 py-3 text-sm font-bold text-foreground bg-secondary/80 hover:bg-secondary rounded-2xl transition-all border border-border/50"
                        >
                            No, Keep it
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 bg-red-500 px-4 py-3 text-sm font-bold text-white rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                        >
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
                title="Upgrade to PRO"
            >
                <div className="space-y-6 text-center">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 blur opacity-75 animate-pulse"></div>
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card text-amber-500">
                                <Sparkles className="h-10 w-10" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold text-foreground">Free Tier Limit Reached</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You've reached the maximum of <span className="font-bold text-primary">3 CVs</span> for the free account.
                            Upgrade to PRO to upload unlimited CVs and unlock advanced AI career features.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            className="w-full bg-primary py-4 rounded-2xl text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-xl shadow-primary/20"
                            onClick={() => {
                                showToast({ title: "Redirecting...", description: "Connecting to checkout." });
                                setShowProModal(false);
                            }}
                        >
                            Move to PRO — $9/mo
                        </button>
                        <button
                            onClick={() => setShowProModal(false)}
                            className="w-full py-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Upload Section */}
            <div className="border border-dashed border-border bg-secondary/20 rounded-3xl p-12 md:p-14">
                <div className="flex flex-col items-center justify-center gap-6 text-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-foreground">
                        <Upload className="h-9 w-9" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-serif text-3xl font-medium text-foreground">
                            Drop your CV here
                        </h3>
                        <p className="text-base text-muted-foreground">
                            PDF, DOCX, DOC or TXT · Max 5MB
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleBrowseClick}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 bg-primary px-7 py-3.5 rounded-full text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FileText className="h-5 w-5" />
                        {uploading ? "Processing..." : "Browse files"}
                    </button>

                    {uploading && (
                        <div className="w-full max-w-sm mt-4 space-y-3 animate-in fade-in duration-500">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-sm font-bold text-primary animate-pulse">{uploadStage}</span>
                                <span className="text-xs font-mono font-bold text-muted-foreground">{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/20 p-0.5">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                >
                                    <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center font-medium">
                                Do not refresh the page
                            </p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* CV List */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="font-serif text-3xl font-medium text-foreground">
                        Your CVs
                    </h2>
                </div>

                {loadingList && (
                    <div className="flex items-center gap-3 p-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <p className="text-base font-medium text-muted-foreground">
                            Loading your CVs...
                        </p>
                    </div>
                )}

                {!loadingList && cvs.length === 0 && (
                    <div className="p-8 text-center border border-border rounded-2xl">
                        <p className="text-base text-muted-foreground">
                            No CVs yet. Upload your first CV to see it here.
                        </p>
                    </div>
                )}

                {!loadingList && cvs.length > 0 && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {cvs.map((cv) => (
                            <div
                                key={cv.id}
                                className="group relative bg-card p-7 rounded-2xl border border-border/40 shadow-sm hover:shadow-craft transition-all duration-200"
                            >
                                <div className="mb-4 flex items-start gap-4">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-base font-medium text-foreground">
                                            {cv.original_filename}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {cv.file_type.toUpperCase()} · {(cv.file_size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border/40">
                                    {cv.score !== null ? (
                                        <div className="flex items-center gap-2 bg-green-50 px-4 py-1.5 rounded-full">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-700">
                                                Score: {cv.score}/100
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAnalyze(cv.id)}
                                            className="inline-flex items-center gap-2 bg-secondary/50 px-4 py-1.5 rounded-full text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Analyze
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setDeleteId(cv.id)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                                        title="Delete CV"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
