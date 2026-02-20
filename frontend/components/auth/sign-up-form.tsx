"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

import { useAuth } from "@/lib/auth/client";

interface SignUpFormProps {
    onSuccess?: (role: "seeker" | "recruiter") => void;
    role?: "seeker" | "recruiter";
}

export function SignUpForm({ onSuccess, role = "seeker" }: SignUpFormProps) {
    const { register, loading, error } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [needsVerification, setNeedsVerification] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLocalError(null);
        setNeedsVerification(false);

        if (!email || !password || !confirmPassword) {
            setLocalError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters.");
            return;
        }

        try {
            const result = await register(email, password);

            // Check if email verification is needed
            if (result && !result.session) {
                setNeedsVerification(true);
            } else if (result && result.session) {
                // Store role and redirect
                localStorage.setItem("user_role", role);
                // User is logged in, redirect to dashboard
                setTimeout(() => {
                    onSuccess?.(role);
                }, 100);
            }
        } catch (err: any) {
            // Check if it's a verification message
            if (err.message && err.message.includes("email")) {
                setNeedsVerification(true);
            } else {
                setLocalError(err.message || "Registration failed. Please try again.");
            }
        }
    };

    const message = localError ?? error;
    const buttonColor = role === "seeker" ? "bg-seeker hover:bg-seeker/90" : "bg-recruiter hover:bg-recruiter/90";

    if (needsVerification) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-blue-50 border-2 border-blue-200"
            >
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-white" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-primary">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                        We've sent a verification link to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                        Click the link in the email to verify your account, then you can sign in.
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/auth/sign-in'}
                    className="text-sm text-primary hover:underline font-medium"
                >
                    Go to Sign In
                </button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                    Email address
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
                        required
                    />
                </label>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                    Password
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </label>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                    Confirm Password
                    <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••"
                        className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
                        required
                    />
                </label>
            </motion.div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{message}</p>
                </motion.div>
            )}

            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className={`mt-2 w-full rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${buttonColor}`}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                    </span>
                ) : (
                    "Create account"
                )}
            </motion.button>
        </form>
    );
}
