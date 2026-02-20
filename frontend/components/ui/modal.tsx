"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-border/60 bg-card p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="font-serif text-2xl font-medium text-foreground">{title}</h3>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}

// Export alias for backward compatibility if needed, though we should update consumers
export { Modal as BrutalistModal };
