"use client";

import { useState } from "react";
import { Briefcase, MapPin, DollarSign, Clock, RefreshCw, Crown } from "lucide-react";

interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    category: string;
    postedDays: number;
    description: string;
}

const MOCK_JOBS: Job[] = [
    {
        id: 1,
        title: "Senior Data Scientist",
        company: "TechCorp AI",
        location: "San Francisco, CA",
        salary: "$120k - $180k",
        type: "Full-time",
        category: "IT",
        postedDays: 2,
        description: "Build ML models and drive data strategy. 5+ years experience required.",
    },
    {
        id: 2,
        title: "Full Stack Developer",
        company: "StartupHub",
        location: "Remote",
        salary: "$90k - $140k",
        type: "Full-time",
        category: "IT",
        postedDays: 1,
        description: "React, Node.js, TypeScript. Build modern web applications.",
    },
    {
        id: 3,
        title: "Financial Analyst",
        company: "InvestBank",
        location: "New York, NY",
        salary: "$80k - $110k",
        type: "Full-time",
        category: "Finance",
        postedDays: 3,
        description: "Analyze financial data and create investment strategies.",
    },
    {
        id: 4,
        title: "Marketing Manager",
        company: "BrandX",
        location: "Los Angeles, CA",
        salary: "$70k - $100k",
        type: "Full-time",
        category: "Marketing",
        postedDays: 5,
        description: "Lead marketing campaigns and brand strategy.",
    },
    {
        id: 5,
        title: "Product Manager",
        company: "CloudSoft",
        location: "Seattle, WA",
        salary: "$110k - $160k",
        type: "Full-time",
        category: "IT",
        postedDays: 4,
        description: "Define product roadmap and work with engineering teams.",
    },
    {
        id: 6,
        title: "UX Designer",
        company: "DesignStudio",
        location: "Austin, TX",
        salary: "$75k - $115k",
        type: "Contract",
        category: "Design",
        postedDays: 2,
        description: "Create user-centered designs for web and mobile applications.",
    },
    {
        id: 7,
        title: "Blockchain Developer",
        company: "CryptoVentures",
        location: "Remote",
        salary: "$130k - $200k",
        type: "Full-time",
        category: "IT",
        postedDays: 1,
        description: "Build decentralized applications on Ethereum and Solana.",
    },
    {
        id: 8,
        title: "Investment Banker",
        company: "GlobalFinance",
        location: "London, UK",
        salary: "£90k - £150k",
        type: "Full-time",
        category: "Finance",
        postedDays: 6,
        description: "Advise clients on mergers, acquisitions, and capital raising.",
    },
];

export default function JobsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const categories = ["All", "IT", "Finance", "Marketing", "Design"];

    const filteredJobs = selectedCategory === "All"
        ? MOCK_JOBS
        : MOCK_JOBS.filter((job) => job.category === selectedCategory);

    const handleApply = () => {
        setShowUpgradeModal(true);
    };

    const handleRefresh = () => {
        setShowUpgradeModal(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-1.5 w-7 bg-primary"></div>
                        <h1 className="font-serif text-3xl md:text-4xl font-bold uppercase tracking-tight text-foreground">
                            Job Board
                        </h1>
                    </div>
                    <p className="text-sm md:text-base font-medium uppercase tracking-widest text-muted-foreground">
                        Premium Feature • Upgrade to Apply
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-6 py-3 text-sm md:text-base font-bold uppercase tracking-widest text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                    <RefreshCw className="h-5 w-5" />
                    Refresh
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-4 overflow-x-auto pb-1">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap border-2 border-foreground px-5 py-2 text-sm font-bold uppercase tracking-widest transition-all ${selectedCategory === category
                                ? "bg-primary text-primary-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Jobs Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {filteredJobs.map((job) => (
                    <div
                        key={job.id}
                        className="border-2 border-foreground bg-card p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    >
                        {/* Job Header */}
                        <div className="mb-4">
                            <h3 className="font-serif text-2xl font-bold uppercase tracking-tight text-foreground">
                                {job.title}
                            </h3>
                            <p className="text-base font-bold uppercase tracking-widest text-muted-foreground">
                                {job.company}
                            </p>
                        </div>

                        {/* Job Meta */}
                        <div className="mb-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-foreground">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-foreground">
                                <DollarSign className="h-4 w-4" />
                                {job.salary}
                            </div>
                            <div className="flex items-center gap-2 text-xs md:text-sm font-medium uppercase tracking-widest text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                Posted {job.postedDays} day{job.postedDays > 1 ? "s" : ""} ago
                            </div>
                        </div>

                        {/* Description */}
                        <p className="mb-5 text-base leading-relaxed text-foreground">
                            {job.description}
                        </p>

                        {/* Apply Button */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleApply}
                                className="inline-flex flex-1 items-center justify-center gap-2 border-2 border-foreground bg-primary px-7 py-3 text-sm md:text-base font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <Briefcase className="h-5 w-5" />
                                Apply Now
                            </button>
                            <span className="inline-flex h-9 w-9 items-center justify-center border-2 border-foreground bg-secondary text-foreground">
                                <Crown className="h-4 w-4" />
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* No Results */}
            {filteredJobs.length === 0 && (
                <div className="border-2 border-dashed border-foreground bg-background/50 p-12 text-center">
                    <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                        No jobs found in this category
                    </p>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="relative w-full max-w-md border-4 border-foreground bg-background p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        {/* Crown Icon */}
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-2 border-foreground bg-primary">
                            <Crown className="h-8 w-8 text-primary-foreground" />
                        </div>

                        {/* Title */}
                        <h2 className="mb-3 text-center font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                            Premium Feature
                        </h2>

                        {/* Message */}
                        <p className="mb-6 text-center text-sm font-medium leading-relaxed text-muted-foreground">
                            You are not a <span className="font-bold text-foreground">PRO USER</span>.
                            Upgrade to unlock job applications and personalized recommendations.
                        </p>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <button
                                className="w-full border-2 border-foreground bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                Upgrade to Pro
                            </button>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="w-full border-2 border-foreground bg-background px-6 py-3 text-sm font-bold uppercase tracking-widest text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
