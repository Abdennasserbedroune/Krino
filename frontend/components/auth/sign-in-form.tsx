"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/lib/auth/client";
import { useTranslation } from "@/hooks/useTranslation";

interface SignInFormProps {
  onSuccess?: (role: "seeker" | "recruiter") => void;
  role?: "seeker" | "recruiter";
}

export function SignInForm({ onSuccess, role = "seeker" }: SignInFormProps) {
  const { login, loading, error } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError(t("auth.signIn.error_required"));
      return;
    }

    try {
      await login(email, password);
      localStorage.setItem("user_role", role);
      setTimeout(() => { onSuccess?.(role); }, 100);
    } catch {
      setLocalError(error || t("auth.signIn.error_invalid"));
    }
  };

  const message = localError ?? error;
  const buttonColor =
    role === "seeker" ? "bg-seeker hover:bg-seeker/90" : "bg-recruiter hover:bg-recruiter/90";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          {t("auth.signIn.label_email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.signIn.placeholder_email")}
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
          {t("auth.signIn.label_password")}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signIn.placeholder_password")}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-muted-foreground"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={t("auth.signIn.aria_toggle_password")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
        transition={{ delay: 0.3 }}
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
            {t("auth.signIn.button_loading")}
          </span>
        ) : (
          t("auth.signIn.button_submit")
        )}
      </motion.button>
    </form>
  );
}
