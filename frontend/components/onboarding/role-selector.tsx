"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";

const ROLE_OPTIONS = [
  {
    value: "STUDENT" as const,
    title: "I’m a student",
    description: "Access AI resume critiques, tailored learning tracks, and application guidance.",
  },
  {
    value: "RECRUITER" as const,
    title: "I recruit talent",
    description: "Collaborate on candidate reviews, share feedback, and streamline hiring workflows.",
  },
];

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<RoleValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRole) {
      setError("Please choose the experience that fits you best.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.error ?? "We couldn't save your choice. Please try again.";
        setError(message);
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
        {ROLE_OPTIONS.map((option) => {
          const isSelected = option.value === selectedRole;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedRole(option.value)}
              className={`relative rounded-2xl border p-6 text-left transition-all duration-200 ${isSelected
                  ? "border-primary bg-secondary/30 shadow-sm"
                  : "border-border/40 bg-background hover:border-border hover:bg-secondary/10"
                }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
              <div className="space-y-2">
                <h2 className="font-serif text-xl font-medium text-foreground">{option.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !selectedRole}
        className="w-full rounded-full bg-primary px-6 py-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
      >
        Continue
      </button>
    </form>
  );
}
