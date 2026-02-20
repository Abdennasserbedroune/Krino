"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Preloader() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show once per browser session and for a short time
        const alreadyShown = typeof window !== "undefined" ? sessionStorage.getItem("pathwise-preloader-shown") : null;
        if (alreadyShown) return;

        setIsVisible(true);
        sessionStorage.setItem("pathwise-preloader-shown", "1");

        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        >
            <div className="relative flex flex-col items-center justify-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                >
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20" />
                    <motion.div
                        className="absolute inset-0 w-24 h-24 rounded-full border-4 border-primary border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-2 w-20 h-20 rounded-full border-4 border-secondary/20"
                    />
                    <motion.div
                        className="absolute inset-2 w-20 h-20 rounded-full border-4 border-secondary border-b-transparent"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20, clipPath: "inset(0 0 100% 0)" }}
                    animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0 0)" }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="mt-8 text-3xl font-serif font-bold text-primary tracking-tight"
                >
                    Pathwise
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="mt-2 text-sm text-muted-foreground"
                >
                    Clarifying the path...
                </motion.p>
            </div>
        </motion.div>
    );
}
