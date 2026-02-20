"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Mail, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-4 py-12">
      <div className="grid w-full max-w-4xl gap-10 rounded-3xl border border-border/80 bg-surface-elevated/30 p-8 shadow-soft md:grid-cols-[1.1fr_1fr] md:p-12">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            <Shield className="h-4 w-4 text-primary" />
            Secure Sign In
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Pick up your search across any device
          </h1>
          <p className="text-base leading-relaxed text-foreground/75">
            Access saved roles, recruiter notes, and upcoming intros. We&apos;ll add SSO providers soon—email works great for now.
          </p>
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-foreground/70">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Magic links available soon
            </div>
            <p>For now, use email and password. We&apos;ll ship passwordless once we roll out recruiter dashboards.</p>
          </div>
        </div>
        <Card className="bg-background/90">
          <CardHeader className="space-y-2 border-b border-border/60">
            <h2 className="font-display text-xl font-semibold text-foreground">Welcome back</h2>
            <p className="text-sm text-foreground/70">Sign in to sync your AutoJobFlow activity.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-foreground/90">
                Email
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3">
                  <Mail className="h-4 w-4 text-foreground/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-11 w-full border-none bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
              </label>
              <label className="space-y-2 text-sm font-medium text-foreground/90">
                Password
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3">
                  <Lock className="h-4 w-4 text-foreground/50" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 w-full border-none bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
              </label>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-foreground/70">
                  <input type="checkbox" className="h-4 w-4 rounded border-border/70 bg-background/70" />
                  Keep me signed in
                </label>
                <Link href="#" className="font-semibold text-primary transition hover:text-primary/80">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full">
                Sign in
              </Button>
            </form>
            <div className="text-center text-sm text-foreground/70">
              Don&apos;t have an account? <Link href="/landing" className="font-semibold text-primary transition hover:text-primary/80">Explore the product</Link>
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Encrypted with SOC2-grade security
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
