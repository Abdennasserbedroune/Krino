"use client";
import React from "react";
import { motion } from "framer-motion";

export const BackgroundBeams = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            {/* Rotating Gradients */}
            <motion.div
                animate={{
                    rotate: [0, 360],
                }}
                transition={{
                    duration: 50,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20"
                style={{
                    background: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, var(--primary) 60deg, transparent 120deg, var(--secondary) 180deg, transparent 240deg, var(--accent) 300deg, transparent 360deg)",
                    filter: "blur(80px)",
                }}
            />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            {/* Shooting Beams */}
            <svg className="absolute w-full h-full opacity-30">
                <defs>
                    <linearGradient id="beam-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                {/* We can add animated lines here if needed, but the rotating gradient provides a nice "beam" effect */}
            </svg>
        </div>
    );
};
