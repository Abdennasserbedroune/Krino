"use client";

import { useState, useRef, useEffect } from "react";
import {
  User, LogOut, Key, ChevronDown,
  Eye, EyeOff, CheckCircle, X,
  Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ProfileDropdown() {
  const { email, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
    localStorage.removeItem("user_role");
    await logout();
    window.location.replace("/");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger ── */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (isOpen) closeAll(); }}
        className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 pl-1.5 pr-2.5 py-1.5 transition-all duration-150 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
          <User className="h-4 w-4" />
        </div>
        <ChevronDown
          className={`h-3 w-3 text-white/80 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {isOpen && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-72 rounded-2xl border border-border/50 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-surface-elevated/60">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-semibold text-foreground">{email}</p>
            </div>
            <button
              onClick={closeAll}
              className="ml-2 flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {!showChangePw ? (
            <div className="p-2 space-y-0.5">

              {/* ── Dark / Light toggle row ── */}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isDark
                    ? <Sun  className="h-4 w-4 text-muted-foreground" />
                    : <Moon className="h-4 w-4 text-muted-foreground" />}
                  <span>{isDark ? "Light mode" : "Dark mode"}</span>
                </div>
                {/* Animated pill indicator */}
                <div
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                    isDark ? "bg-primary" : "bg-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isDark ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>

              <div className="my-1 h-px bg-border/60" />

              {/* Change password */}
              <button
                onClick={() => setShowChangePw(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Key className="h-4 w-4 text-muted-foreground" />
                Change Password
              </button>

              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-4">
              <button
                onClick={() => { setShowChangePw(false); setPwError(""); setPwSuccess(false); }}
                className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>

              <p className="text-sm font-bold text-foreground mb-3">Change Password</p>

              {pwSuccess ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-3">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Password updated successfully!
                  </p>
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
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
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
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>

                  {pwError && (
                    <p className="text-xs font-medium text-destructive bg-destructive/8 border border-destructive/25 rounded-lg px-3 py-2">
                      {pwError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pwLoading || !newPw || !confirmPw}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
