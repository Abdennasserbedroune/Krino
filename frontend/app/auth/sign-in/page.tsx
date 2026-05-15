"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { useAuth } from "@/lib/auth/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SignInPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const { t } = useLanguage();

  // If already logged in, redirect immediately based on their actual role
  useEffect(() => {
    if (!loading && user) {
      router.replace(role === "recruiter" ? "/dashboard/recruiter" : "/dashboard");
    }
  }, [user, role, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">{t.ui.loading}</p>
        </div>
      </div>
    );
  }

  // After successful login, SignInForm calls onSuccess with the role from user_metadata
  const handleSuccess = (role: "seeker" | "recruiter") => {
    router.replace(role === "recruiter" ? "/dashboard/recruiter" : "/dashboard");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-background font-sans overflow-hidden">
      <div className="fixed top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="space-y-8 p-10 rounded-[2rem] shadow-soft border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex justify-center">
            <Link href="/" className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Krino
            </Link>
          </div>

          <header className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>{t.auth.signInTitle}</h1>
            <p className="text-sm" style={{ color: "var(--text-body)" }}>{t.auth.signInSubtitle ?? "Sign in to your account"}</p>
          </header>

          <SignInForm onSuccess={handleSuccess} />

          <p className="text-center text-sm" style={{ color: "var(--text-body)" }}>
            {t.auth.noAccount}{" "}
            <Link href="/auth/sign-up" className="font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
              {t.auth.signUpBtn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
