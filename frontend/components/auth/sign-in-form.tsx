"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SignInFormProps {
  onSuccess: (role: "seeker" | "recruiter") => void;
  // role prop removed — we no longer need it passed from outside
  role?: "seeker" | "recruiter"; // kept for backward compat but ignored
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await login(email, password);
      // Read role directly from the Supabase user_metadata — single source of truth
      const actualRole = (data?.user?.user_metadata?.role ?? "seeker") as "seeker" | "recruiter";
      onSuccess(actualRole);
    } catch (err: any) {
      setError(err?.message ?? t.auth.invalidCredentials ?? "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium" style={{ color: "var(--text-body)" }}>
          {t.auth.emailLabel ?? "Email"}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.emailPlaceholder ?? "you@example.com"}
          required
          autoComplete="email"
          className="w-full h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition"
          style={{
            borderColor: "var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--input-text)",
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium" style={{ color: "var(--text-body)" }}>
          {t.auth.passwordLabel ?? "Password"}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition"
          style={{
            borderColor: "var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--input-text)",
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "var(--text-primary)", boxShadow: "var(--shadow-cta)" }}
      >
        {isLoading ? (t.ui.loading ?? "Loading…") : (t.auth.signInBtn ?? "Sign in")}
      </button>
    </form>
  );
}
