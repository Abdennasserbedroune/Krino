"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoLoginPage() {
    const router = useRouter();

    useEffect(() => {
        console.log("[AutoLogin] Setting mock auth in localStorage");
        localStorage.setItem("mock_auth", "true");

        setTimeout(() => {
            console.log("[AutoLogin] Redirecting to dashboard");
            router.push("/dashboard");
        }, 1000);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm font-medium">Setting up mock authentication...</p>
                <p className="text-xs text-gray-500 mt-2">You will be redirected to dashboard</p>
            </div>
        </div>
    );
}
