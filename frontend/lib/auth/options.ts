import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// SECURITY: Hard-fail on missing secret — never fall back to a default
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "[auth] NEXTAUTH_SECRET environment variable is required but not set. " +
    "Set it in your .env.local (dev) or in your hosting provider's environment variables (prod)."
  );
}

// SECURITY: Hard-fail on missing Google OAuth credentials
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "[auth] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required."
  );
}

const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [googleProvider],
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
};

export default authOptions;
