"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const InfiniteMovingCards = ({
    items,
    direction = "left",
    speed = "slow",
    pauseOnHover = true,
    className,
}: {
    items: {
        quote: string;
        name: string;
        title: string;
    }[];
    direction?: "left" | "right";
    speed?: "fast" | "normal" | "slow";
    pauseOnHover?: boolean;
    className?: string;
}) => {
    const duration = speed === "fast" ? "20s" : speed === "normal" ? "40s" : "60s";

    return (
        <div
            className={cn(
                "overflow-hidden w-full",
                className
            )}
        >
            <div
                className={cn(
                    "flex gap-6 w-fit",
                    pauseOnHover && "hover:pause-animation"
                )}
                style={{
                    animation: `scroll-${direction} ${duration} linear infinite`,
                }}
            >
                {/* Original set of items */}
                {items.map((item, idx) => (
                    <div
                        key={`original-${idx}`}
                        className="min-w-[350px] max-w-[350px] md:min-w-[450px] md:max-w-[450px] flex-shrink-0 relative rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm px-8 py-6"
                    >
                        <blockquote>
                            <p className="relative z-20 text-sm leading-[1.6] text-gray-600 font-normal mb-5">
                                "{item.quote}"
                            </p>
                            <div className="relative z-20 flex flex-col gap-1">
                                <span className="text-sm leading-[1.6] text-gray-900 font-bold">
                                    {item.name}
                                </span>
                                <span className="text-sm leading-[1.6] text-gray-500 font-normal">
                                    {item.title}
                                </span>
                            </div>
                        </blockquote>
                    </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {items.map((item, idx) => (
                    <div
                        key={`duplicate-${idx}`}
                        className="min-w-[350px] max-w-[350px] md:min-w-[450px] md:max-w-[450px] flex-shrink-0 relative rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm px-8 py-6"
                    >
                        <blockquote>
                            <p className="relative z-20 text-sm leading-[1.6] text-gray-600 font-normal mb-5">
                                "{item.quote}"
                            </p>
                            <div className="relative z-20 flex flex-col gap-1">
                                <span className="text-sm leading-[1.6] text-gray-900 font-bold">
                                    {item.name}
                                </span>
                                <span className="text-sm leading-[1.6] text-gray-500 font-normal">
                                    {item.title}
                                </span>
                            </div>
                        </blockquote>
                    </div>
                ))}
            </div>
        </div>
    );
};
