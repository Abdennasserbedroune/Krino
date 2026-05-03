import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Returns the NextAuth config.
 *
 * SECURITY: Validation runs lazily (at first request) — NOT at module load
 * time — so `next build` succeeds even when env vars are absent in CI/build
 * environments. The error will be thrown on the first real auth request if
 * any required variable is missing.
 */
function buildAuthOptions(): NextAuthOptions {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error(
      "[auth] NEXTAUTH_SECRET is required. " +
      "Add it to Vercel → Settings → Environment Variables (or .env.local for dev)."
    );
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "[auth] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required. " +
      "Add them to Vercel → Settings → Environment Variables."
    );
  }

  return {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    ],
    pages: {
      signIn: "/signin",
    },
    session: {
      strategy: "jwt",
    },
  };
}

// Lazy singleton — built on first import (i.e. first request), never at build time
let _authOptions: NextAuthOptions | null = null;

export function getAuthOptions(): NextAuthOptions {
  if (!_authOptions) {
    _authOptions = buildAuthOptions();
  }
  return _authOptions;
}

// Keep the named export for any existing imports of authOptions
export const authOptions: NextAuthOptions = new Proxy({} as NextAuthOptions, {
  get(_target, prop) {
    return (getAuthOptions() as any)[prop];
  },
});

export default authOptions;
