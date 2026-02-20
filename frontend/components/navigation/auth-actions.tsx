"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface AuthActionsProps {
  readonly session: Session | null;
}

export function AuthActions({ session }: AuthActionsProps) {
  if (!session) {
    return (
      <Link
        href="/signin"
        className="text-sm font-semibold text-foreground transition hover:text-primary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-foreground transition hover:text-primary"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Sign out
      </button>
    </div>
  );
}
