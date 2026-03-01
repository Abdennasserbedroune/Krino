"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Key, ChevronDown, Eye, EyeOff, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function ProfileDropdown() {
    const { email, logout } = useAuth();
    const router = useRouter();
    const [isOpen,       setIsOpen]       = useState(false);
    const [showChangePw, setShowChangePw] = useState(false);
    const [newPw,        setNewPw]        = useState("");
    const [confirmPw,    setConfirmPw]    = useState("");
    const [showPw,       setShowPw]       = useState(false);
    const [pwLoading,    setPwLoading]    = useState(false);
    const [pwError,      setPwError]      = useState("");
    const [pwSuccess,    setPwSuccess]    = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeAll();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function closeAll() {
        setIsOpen(false);
        setShowChangePw(false);
        setPwError("");
        setPwSuccess(false);
        setNewPw("");
        setConfirmPw("");
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError("");
        if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
        if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
        setPwLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPw });
        setPwLoading(false);
        if (error) { setPwError(error.message); return; }
        setPwSuccess(true);
        setNewPw(""); setConfirmPw("");
        setTimeout(() => closeAll(), 2200);
    };

    const handleLogout = async () => {
        // Clear cached role so next login shows the role picker cleanly
        localStorage.removeItem("user_role");
        await logout();
        router.push("/");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button — styled for the blue gradient header */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (isOpen) closeAll(); }}
                className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 pl-1.5 pr-2.5 py-1.5 transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                    <User className="h-4 w-4" />
                </div>
                <ChevronDown className={`h-3 w-3 text-white/80 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-[70] mt-2 w-72 rounded-2xl border border-border/40 bg-background shadow-xl overflow-hidden">
                    {/* Header: signed in as */}
                    <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-secondary/30">
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                            <p className="truncate text-sm font-semibold text-foreground">{email}</p>
                        </div>
                        <button onClick={closeAll} className="ml-2 flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-secondary transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {!showChangePw ? (
                        /* ── Main menu ── */
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setShowChangePw(true)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
                            >
                                <Key className="h-4 w-4 text-muted-foreground" />
                                Change Password
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        /* ── Change password panel ── */
                        <div className="p-4">
                            <button
                                onClick={() => { setShowChangePw(false); setPwError(""); setPwSuccess(false); }}
                                className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Back
                            </button>

                            <p className="text-sm font-bold text-foreground mb-3">Change Password</p>

                            {pwSuccess ? (
                                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    <p className="text-sm font-semibold text-emerald-700">Password updated successfully!</p>
                                </div>
                            ) : (
                                <form onSubmit={handleChangePassword} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPw ? "text" : "password"}
                                                value={newPw}
                                                onChange={e => setNewPw(e.target.value)}
                                                placeholder="Min. 6 characters"
                                                autoComplete="new-password"
                                                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirm Password</label>
                                        <input
                                            type={showPw ? "text" : "password"}
                                            value={confirmPw}
                                            onChange={e => setConfirmPw(e.target.value)}
                                            placeholder="Repeat new password"
                                            autoComplete="new-password"
                                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                        />
                                    </div>

                                    {pwError && (
                                        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                            {pwError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={pwLoading || !newPw || !confirmPw}
                                        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {pwLoading ? "Updating…" : "Update Password"}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
