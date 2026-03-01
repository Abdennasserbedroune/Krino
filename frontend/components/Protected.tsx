"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";
import { useEffect, ReactNode } from "react";

export default function Protected({ children }: { children: ReactNode }) {
    const { session, loading } = useAuthContext();
    const router = useRouter();

    // Use router.replace (not push) so the protected page is removed from history —
    // pressing Back from sign-in will never return to a guarded route.
    useEffect(() => {
        if (!loading && !session) {
            router.replace("/auth/sign-in");
        }
    }, [loading, session, router]);

    // Kill back-forward-cache restorations for signed-out users.
    // Browsers (Chrome/Safari) can restore a cached version of the page even after
    // the session is gone — this event catches that and hard-redirects.
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted && !session) {
                window.location.replace("/auth/sign-in");
            }
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, [session]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <p className="text-sm font-medium text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return <>{children}</>;
}
