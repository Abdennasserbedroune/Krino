"use client";

import { useAuthContext } from "@/providers/AuthProvider";
import { useState } from "react";

export function useAuth() {
  const context = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await context.login(email, password);
    if (authError) {
      setError(authError.message);
      throw new Error(authError.message);
    }
    return data;
  };

  const register = async (email: string, password: string, role: "seeker" | "recruiter") => {
    setError(null);
    const { data, error: authError } = await context.register(email, password, role);
    if (authError) {
      setError(authError.message);
      throw new Error(authError.message);
    }
    return data;
  };

  const logout = async () => {
    setError(null);
    const { error: authError } = await context.logout();
    if (authError) {
      setError(authError.message);
      throw new Error(authError.message);
    }
  };

  return {
    user: context.user,
    email: context.email,
    role: context.role,
    loading: context.loading,
    accessToken: context.session?.access_token ?? null,
    error,
    login,
    register,
    logout
  };
}
