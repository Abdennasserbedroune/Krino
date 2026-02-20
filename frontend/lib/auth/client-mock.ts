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

    // Simulate loading and auto-login with mock user
    useEffect(() => {
        // Check localStorage for mock auth
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

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Mock successful login
            localStorage.setItem("mock_auth", "true");
            setState({
                user: { ...MOCK_USER, email },
                email: email,
                accessToken: "mock-token",
            });

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
            setState({
                user: { ...MOCK_USER, email },
                email: email,
                accessToken: "mock-token",
            });

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

    return {
        user: state.user,
        email: state.email,
        accessToken: state.accessToken,
        loading,
        error,
        login,
        register,
        logout,
    };
}
