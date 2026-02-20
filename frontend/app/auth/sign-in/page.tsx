"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, UserCircle, ArrowRight } from "lucide-react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { useAuth } from "@/lib/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"seeker" | "recruiter" | null>(null);


  const handleSuccess = (role: "seeker" | "recruiter") => {
    // Redirect based on role
    if (role === "recruiter") {
      router.push("/dashboard/recruiter");
    } else {
      router.push("/dashboard");
    }
  };

  // Show loading while auth is initializing
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-background font-sans overflow-hidden">
      <div className="relative z-10 w-full max-w-md">
        <div className="space-y-8 bg-card/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-soft border border-border/40">
          {/* Logo */}
          <div className="flex justify-center">
            <Link href="/" className="font-serif text-3xl font-bold tracking-tight text-primary hover:scale-105 transition-transform">
              Pathwise
            </Link>
          </div>

          {/* Header */}
          <header className="space-y-3 text-center">
            <h1 className="font-serif text-4xl text-primary">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Choose your role to continue</p>
          </header>

          {!selectedRole ? (
            <div className="grid gap-4">
              <button
                onClick={() => setSelectedRole("seeker")}
                className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 text-left"
              >
                  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-seeker/10 flex items-center justify-center">
                      <UserCircle className="w-7 h-7 text-seeker" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-xl font-bold text-primary mb-1">Job Seeker</h3>
                      <p className="text-xs text-muted-foreground">Optimize your resume & get hired</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-seeker group-hover:translate-x-1 transition-transform" />
                  </div>
              </button>

              <button
                onClick={() => setSelectedRole("recruiter")}
                className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all duration-200 text-left"
              >
                  <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-recruiter/10 flex items-center justify-center">
                      <Briefcase className="w-7 h-7 text-recruiter" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-xl font-bold text-primary mb-1">Recruiter</h3>
                      <p className="text-xs text-muted-foreground">Screen candidates with AI precision</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-recruiter group-hover:translate-x-1 transition-transform" />
                  </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  ← Back to role selection
                </button>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-tinted/50 border border-border/30">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedRole === 'seeker' ? 'bg-seeker/10' : 'bg-recruiter/10'}`}>
                    {selectedRole === "seeker" ? (
                      <UserCircle className="w-5 h-5 text-seeker" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-recruiter" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Signing in as</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedRole}</p>
                  </div>
                </div>

                <SignInForm onSuccess={handleSuccess} role={selectedRole!} />
              </div>
            )}

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account yet?{" "}
            <Link href="/auth/sign-up" className="text-primary font-medium hover:underline transition-colors">
              Create one
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
