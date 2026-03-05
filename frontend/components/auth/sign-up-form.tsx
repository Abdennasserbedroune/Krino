"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

import { useAuth } from "@/lib/auth/client";
import { useTranslation } from "@/hooks/useTranslation";

interface SignUpFormProps {
  onSuccess?: (role: "seeker" | "recruiter") => void;
  role?: "seeker" | "recruiter";
}

export function SignUpForm({ onSuccess, role = "seeker" }: SignUpFormProps) {
  const { register, loading, error } = useAuth();
  const { t } = useTranslation();
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
      setLocalError(t("auth.signUp.error_required"));
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(t("auth.signUp.error_password_match"));
      return;
    }
    if (password.length < 6) {
      setLocalError(t("auth.signUp.error_password_length"));
      return;
    }

    try {
      const result = await register(email, password);
      if (result && !result.session) {
        setNeedsVerification(true);
      } else if (result && result.session) {
        localStorage.setItem("user_role", role);
        setTimeout(() => { onSuccess?.(role); }, 100);
      }
    } catch (err: any) {
      if (err.message?.includes("email")) {
        setNeedsVerification(true);
      } else {
        setLocalError(err.message || t("auth.signUp.error_registration_failed"));
      }
    }
  };

  const message = localError ?? error;
  const buttonColor =
    role === "seeker" ? "bg-seeker hover:bg-seeker/90" : "bg-recruiter hover:bg-recruiter/90";

  if (needsVerification) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-8"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-bold text-primary">{t("auth.signUp.verification.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("auth.signUp.verification.body")} <strong>{email}</strong>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("auth.signUp.verification.instructions")}
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/auth/sign-in")}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("auth.signUp.verification.go_to_sign_in")}
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          {t("auth.signUp.label_email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.signUp.placeholder_email")}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
            required
          />
        </label>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          {t("auth.signUp.label_password")}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signUp.placeholder_password")}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={t("auth.signUp.aria_toggle_password")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          {t("auth.signUp.label_confirm_password")}
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("auth.signUp.placeholder_password")}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
            required
          />
        </label>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
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
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t("auth.signUp.button_loading")}
          </span>
        ) : (
          t("auth.signUp.button_submit")
        )}
      </motion.button>
    </form>
  );
}
