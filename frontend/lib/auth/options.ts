import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID ?? "placeholder",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "placeholder",
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
  providers: [googleProvider],
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
};

export default authOptions;
