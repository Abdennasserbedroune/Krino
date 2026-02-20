"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Key, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export function ProfileDropdown() {
    const { email, logout } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full border border-border bg-background pl-2 pr-3 py-1.5 transition-all hover:bg-secondary/50"
            >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground">
                    <User className="h-4 w-4" />
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border/40 bg-background p-2 shadow-craft">
                    <div className="mb-2 border-b border-border/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                        <p className="truncate text-sm font-medium text-foreground">{email}</p>
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                // Placeholder for change password
                                alert("Change password feature coming soon!");
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/50"
                        >
                            <Key className="h-4 w-4 text-muted-foreground" />
                            Change Password
                        </button>

                        <button
                            onClick={() => {
                                logout();
                                router.push("/");
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
