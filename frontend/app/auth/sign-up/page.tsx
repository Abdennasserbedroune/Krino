"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, UserCircle, ArrowRight } from "lucide-react";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { useAuth } from "@/lib/auth/client";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"seeker" | "recruiter" | null>(null);

  // If the user is already authenticated, send them straight to their dashboard.
  // Use replace so Back never returns to sign-up.
  useEffect(() => {
    if (!loading && user) {
      const cached = localStorage.getItem("user_role");
      router.replace(cached === "recruiter" ? "/dashboard/recruiter" : "/dashboard");
    }
  }, [user, loading, router]);

  const handleSuccess = (role: "seeker" | "recruiter") => {
    localStorage.setItem("user_role", role);
    if (role === "recruiter") {
      router.replace("/dashboard/recruiter");
    } else {
      router.replace("/dashboard");
    }
  };

  // Show spinner while auth hydrates OR while redirect is pending
  if (loading || user) {
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
      <BackgroundBeams />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 bg-card/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-soft border border-border/40"
        >
          {/* Logo */}
          <div className="flex justify-center">
            <Link href="/" className="font-serif text-3xl font-bold tracking-tight text-primary hover:scale-105 transition-transform">
              Pathwise
            </Link>
          </div>

          {/* Header */}
          <header className="space-y-3 text-center">
            <h1 className="font-serif text-4xl text-primary">Get started</h1>
            <p className="text-sm text-muted-foreground">Create your account to begin</p>
          </header>

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="grid gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole("seeker")}
                  className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 text-left"
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
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole("recruiter")}
                  className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 text-left"
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
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="sign-up-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  ← Back to role selection
                </button>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-tinted/50 border border-border/30">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedRole === 'seeker' ? 'bg-seeker/10' : 'bg-recruiter/10'}`}>
                    {selectedRole === "seeker" ? (
                      <UserCircle className={`w-5 h-5 ${selectedRole === 'seeker' ? 'text-seeker' : 'text-recruiter'}`} />
                    ) : (
                      <Briefcase className={`w-5 h-5 ${selectedRole === 'seeker' ? 'text-seeker' : 'text-recruiter'}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Registering as</p>
                    <p className="text-xs text-muted-foreground capitalize">{selectedRole}</p>
                  </div>
                </div>

                <SignUpForm onSuccess={handleSuccess} role={selectedRole!} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-primary font-medium hover:underline transition-colors">
              Sign in
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
