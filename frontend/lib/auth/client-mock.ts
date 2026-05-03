// SECURITY: This file is a mock auth client for local development ONLY.
// It uses localStorage and a hardcoded token — it must NEVER run in production.
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "[auth] client-mock.ts was imported in a production build. " +
    "This file must only be used in development. " +
    "Check your imports and ensure no production code references this module."
  );
}

"use client";

import { useEffect, useState } from "react";

export interface AuthState {
    user: any | null;
    email: string | null;
    accessToken: string | null;
}

// Mock user for local development
const MOCK_USER = {
    id: "mock-user-id",
    email: "test@example.com",
    role: "authenticated",
};

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        email: null,
        accessToken: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const mockAuth = localStorage.getItem("mock_auth");

        setTimeout(() => {
            if (mockAuth === "true") {
                setState({
                    user: MOCK_USER,
                    email: MOCK_USER.email,
                    accessToken: "mock-token",
                });
            }
            setLoading(false);
        }, 500);
    }, []);

    async function login(email: string, password: string) {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            localStorage.setItem("mock_auth", "true");
            setState({ user: { ...MOCK_USER, email }, email, accessToken: "mock-token" });
            return { user: { ...MOCK_USER, email }, session: { access_token: "mock-token" } };
        } catch (err: any) {
            const errorMessage = err?.message ?? "Unable to sign in.";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function register(email: string, password: string) {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            localStorage.setItem("mock_auth", "true");
            setState({ user: { ...MOCK_USER, email }, email, accessToken: "mock-token" });
            return { user: { ...MOCK_USER, email }, session: { access_token: "mock-token" } };
        } catch (err: any) {
            const errorMessage = err?.message ?? "Unable to create account.";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        setLoading(true);
        try {
            localStorage.removeItem("mock_auth");
            setState({ user: null, email: null, accessToken: null });
        } catch (err: any) {
            setError(err?.message ?? "Unable to log out");
        } finally {
            setLoading(false);
        }
    }

    return { user: state.user, email: state.email, accessToken: state.accessToken, loading, error, login, register, logout };
}
