"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";

const ROLE_KEYS = [
  { value: "STUDENT" as const,   translationKey: "student" },
  { value: "RECRUITER" as const, translationKey: "recruiter" },
];

type RoleValue = (typeof ROLE_KEYS)[number]["value"];

export function RoleSelector() {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<RoleValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRole) {
      setError(t("onboarding.error_no_role"));
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? t("onboarding.error_save_failed"));
        return;
      }

      await update({ user: { role: selectedRole } });
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_KEYS.map(({ value, translationKey }) => {
          const isSelected = value === selectedRole;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedRole(value)}
              className={`relative rounded-2xl border p-6 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-secondary/30 shadow-sm"
                  : "border-border/40 bg-background hover:border-border hover:bg-secondary/10"
              }`}
            >
              {isSelected && (
                <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={12} />
                </div>
              )}
              <div className="space-y-2">
                <h2 className="font-serif text-xl font-medium text-foreground">
                  {t(`onboarding.roles.${translationKey}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`onboarding.roles.${translationKey}.description`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm font-medium text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !selectedRole}
        className="w-full rounded-full bg-primary px-6 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {t("onboarding.button_continue")}
      </button>
    </form>
  );
}
