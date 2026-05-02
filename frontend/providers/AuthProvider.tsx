"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

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
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            // Sync role from Supabase metadata to localStorage on initial load
            const metaRole = data.session?.user?.user_metadata?.role;
            if (metaRole) {
                localStorage.setItem("user_role", metaRole);
            }
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            // Sync role on every auth state change (login, token refresh, etc.)
            const metaRole = session?.user?.user_metadata?.role;
            if (metaRole) {
                localStorage.setItem("user_role", metaRole);
            }
            setLoading(false);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        // Immediately sync role to localStorage after successful login
        const metaRole = result.data?.user?.user_metadata?.role;
        if (metaRole) {
            localStorage.setItem("user_role", metaRole);
        }
        return result;
    };

    // role is now a required param — passed from sign-up form
    const register = async (email: string, password: string, role: "seeker" | "recruiter") => {
        return supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role }, // persisted in Supabase user_metadata
            },
        });
    };

    const logout = async () => {
        localStorage.removeItem("user_role");
        return supabase.auth.signOut();
    };

    // Derive role from Supabase user metadata (source of truth)
    const role = (user?.user_metadata?.role ?? null) as "seeker" | "recruiter" | null;

    const value = {
        session,
        user,
        loading,
        email: user?.email ?? null,
        role,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
};
