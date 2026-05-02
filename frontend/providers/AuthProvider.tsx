"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  email: string | null;
  role: "seeker" | "recruiter" | null;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, role: "seeker" | "recruiter") => Promise<any>;
  logout: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // All state initialises to null/true — identical on server and client, no hydration mismatch
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Supabase client is created ONCE after mount, never at module scope
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSb = () => {
    if (!sbRef.current) sbRef.current = createClient();
    return sbRef.current;
  };

  useEffect(() => {
    const sb = getSb();

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      const metaRole = data.session?.user?.user_metadata?.role;
      if (metaRole && typeof window !== "undefined") {
        localStorage.setItem("user_role", metaRole);
      }
      setLoading(false);
    });

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      const metaRole = session?.user?.user_metadata?.role;
      if (metaRole && typeof window !== "undefined") {
        localStorage.setItem("user_role", metaRole);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const sb = getSb();
    const result = await sb.auth.signInWithPassword({ email, password });
    const metaRole = result.data?.user?.user_metadata?.role;
    if (metaRole && typeof window !== "undefined") {
      localStorage.setItem("user_role", metaRole);
    }
    return result;
  };

  const register = async (email: string, password: string, role: "seeker" | "recruiter") => {
    return getSb().auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
  };

  const logout = async () => {
    if (typeof window !== "undefined") localStorage.removeItem("user_role");
    return getSb().auth.signOut();
  };

  const role = (user?.user_metadata?.role ?? null) as "seeker" | "recruiter" | null;

  return (
    <AuthContext.Provider value={{ session, user, loading, email: user?.email ?? null, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");
  return context;
};
