import Link from "next/link";
import { Check } from "lucide-react";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-serif text-2xl font-medium tracking-tight">Pathwise</Link>
                    <div className="flex items-center gap-4">
                        <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Sign in
                        </Link>
                        <Link href="/dashboard" className="glass-button px-5 py-2 text-sm font-medium">
                            Try for free
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="mb-16 text-center">
                        <h1 className="font-serif text-5xl md:text-6xl mb-6 text-foreground">
                            Simple pricing
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Start for free, upgrade when you need more power. No hidden fees.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
                        {/* Free Plan */}
                        <div className="bg-card p-10 rounded-3xl border border-border shadow-sm flex flex-col">
                            <div className="mb-6">
                                <h3 className="font-serif text-2xl mb-2">Starter</h3>
                                <div className="text-4xl font-medium">$0 <span className="text-lg font-normal text-muted-foreground">/ month</span></div>
                                <p className="text-sm text-muted-foreground mt-2">For individuals and testing</p>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    "Up to 3 resume checks per day",
                                    "1 recruiter session per day",
                                    "Basic scoring and comments",
                                    "Standard support"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check size={18} className="text-green-600" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/dashboard" className="w-full py-4 rounded-full border border-foreground text-center font-medium hover:bg-secondary transition-colors">
                                Get Started
                            </Link>
                        </div>

                        {/* Paid Plan */}
                        <div className="bg-foreground text-background p-10 rounded-3xl shadow-craft flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-white/20 px-4 py-1.5 rounded-bl-2xl text-xs font-medium backdrop-blur-sm">
                                Most Popular
                            </div>
                            <div className="mb-6">
                                <h3 className="font-serif text-2xl mb-2">Plus</h3>
                                <div className="text-4xl font-medium">$12 <span className="text-lg font-normal text-white/60">/ month</span></div>
                                <p className="text-sm text-white/60 mt-2">For active job seekers & small teams</p>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    "Higher daily limits (20 checks/day)",
                                    "Recruiter mode: 10 resumes/session",
                                    "Priority processing",
                                    "Detailed feedback reports",
                                    "Priority email support"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        <Check size={18} className="text-green-400" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/dashboard" className="w-full py-4 rounded-full bg-white text-black text-center font-medium hover:bg-white/90 transition-colors">
                                Upgrade to Plus
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
