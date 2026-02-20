"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";
import { useEffect, ReactNode } from "react";

export default function Protected({ children }: { children: ReactNode }) {
    const { session, loading } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !session) {
            router.push("/auth/sign-in");
        }
    }, [loading, session, router]);

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
