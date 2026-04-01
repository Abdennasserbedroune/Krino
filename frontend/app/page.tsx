"use client";

import Link from "next/link";
import { ArrowRight, Check, Upload, FileText, Search, Shield, Clock, Users, Briefcase, Lock, Sparkles, ChevronRight, MessageCircle, ListChecks, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { useAuth } from "@/lib/auth/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ThemeToggle } from "@/components/navigation/theme-toggle";

const clipAnimation = {
  initial: { clipPath: "inset(0 0 100% 0)", opacity: 0 },
  whileInView: { clipPath: "inset(0 0 0 0)", opacity: 1 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
} as any;

const jobSeekerTestimonials = [
  {
    quote: "Pathwise helped me identify exactly why I wasn't getting callbacks. I fixed my resume and got an interview the next day.",
    name: "Sarah Chen",
    title: "Software Engineer at TechFlow",
  },
  {
    quote: "The AI feedback is so specific. It didn't just say 'improve skills', it told me to add my AWS certification.",
    name: "Emily Watson",
    title: "Cloud Architect",
  },
  {
    quote: "Finally, a tool that understands context. It knew my 'Team Lead' experience was relevant for the Manager role.",
    name: "David Kim",
    title: "Product Manager",
  },
  {
    quote: "I was skeptical about AI, but the match score was spot on. It highlighted gaps I hadn't even noticed.",
    name: "Jessica Bloom",
    title: "Marketing Director",
  },
  {
    quote: "Used the free checks to optimize my resume for 3 different roles. Landed interviews for 2 of them.",
    name: "Michael Torres",
    title: "UX Designer",
  },
];

const recruiterTestimonials = [
  {
    quote: "As a recruiter, this saves me hours. The batch screening is incredibly accurate and fair.",
    name: "Marcus Rodriguez",
    title: "Head of Talent at Nexus",
  },
  {
    quote: "We processed 500 applicants in one afternoon. The ranking system is a game changer for our small team.",
    name: "Jennifer Wu",
    title: "HR Director at StartUp Inc",
  },
  {
    quote: "It doesn't just look for keywords. It actually understands seniority and relevant experience. Highly impressed.",
    name: "Robert Fox",
    title: "Senior Technical Recruiter",
  },
  {
    quote: "The auto-delete privacy feature was a must for our compliance team. Glad Pathwise takes security seriously.",
    name: "Amanda Lowery",
    title: "People Ops Manager",
  },
  {
    quote: "I can finally focus on interviewing the right candidates instead of drowning in PDF resumes.",
    name: "Thomas Wright",
    title: "Talent Acquisition Lead",
  },
];

// Pill label above section headings
function SectionPill({ children, color = "primary" }: { children: React.ReactNode; color?: "primary" | "seeker" | "recruiter" }) {
  const colorMap = {
    primary: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
    seeker:  "bg-[var(--seeker-soft)] text-[var(--seeker)] border-[var(--seeker-soft-border)]",
    recruiter: "bg-[var(--recruiter-soft)] text-[var(--recruiter)] border-[var(--recruiter-soft-border)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest border mb-5 ${colorMap[color]}`}>
      {children}
    </span>
  );
}

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState<"seeker" | "recruiter">("seeker");
  const { user } = useAuth();
  const { t } = useLanguage();

  const getDashboardPath = () => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role");
      return role === "recruiter" ? "/dashboard/recruiter" : "/dashboard";
    }
    return "/dashboard";
  };
  const ctaHref = user ? getDashboardPath() : "/auth/sign-in";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden relative">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-serif text-2xl font-bold tracking-tight text-[var(--primary)] select-none cursor-default">Pathwise</div>
          <nav className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href={getDashboardPath()} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-secondary">
                {t.nav.dashboard}
              </Link>
            ) : (
              <Link href="/auth/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-secondary">
                {t.nav.signIn}
              </Link>
            )}
            <Link
              href={ctaHref}
              className={`relative group px-6 py-2.5 rounded-full overflow-hidden font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 text-white ${
                activeRole === 'seeker'
                  ? 'bg-[var(--seeker)]'
                  : 'bg-[var(--recruiter)]'
              }`}
            >
              <span className="relative z-10">{t.nav.getStarted}</span>
              <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-28 pb-20 relative">

        {/* ── HERO ── */}
        <section className="container mx-auto px-6 mb-24 relative">
          <div className="max-w-5xl mx-auto text-center">

            {/* Role Toggle */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex bg-[var(--surface-elevated)] p-1.5 rounded-full shadow-[var(--shadow-craft)] mb-12 border border-border"
            >
              <button
                onClick={() => setActiveRole("seeker")}
                className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeRole === 'seeker'
                    ? 'bg-[var(--seeker)] text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {t.hero.roleSeeker}
              </button>
              <button
                onClick={() => setActiveRole("recruiter")}
                className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeRole === 'recruiter'
                    ? 'bg-[var(--recruiter)] text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {t.hero.roleRecruiter}
              </button>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: "circOut" }}
                className="space-y-7"
              >
                <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight text-[var(--primary)]">
                  {activeRole === "seeker" ? (
                    <>
                      {t.hero.headlineSeeker.split(t.hero.gradientSeeker)[0]}<br />
                      <span className="text-transparent bg-clip-text italic inline-block py-1 bg-gradient-to-r from-[var(--seeker)] to-blue-400">
                        {t.hero.gradientSeeker}
                      </span>
                    </>
                  ) : (
                    <>
                      {t.hero.headlineRecruiterLine1}<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--recruiter)] to-orange-400 italic inline-block py-1">
                        {t.hero.gradientRecruiter}
                      </span>
                    </>
                  )}
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  {activeRole === "seeker" ? t.hero.subSeeker : t.hero.subRecruiter}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                  <Link
                    href={ctaHref}
                    className={`btn-primary text-white shadow-[var(--shadow-glow)] ${
                      activeRole === 'seeker'
                        ? 'bg-[var(--seeker)] hover:bg-[var(--seeker)]/90'
                        : 'bg-[var(--recruiter)] hover:bg-[var(--recruiter)]/90'
                    }`}
                  >
                    {activeRole === "seeker" ? t.hero.ctaSeeker : t.hero.ctaRecruiter}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span>{t.hero.freeChecks}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── JOB SEEKER TESTIMONIALS ── */}
        <section className="mb-28 relative overflow-hidden">
          {/* Dark navy band */}
          <div className="bg-[var(--testimonial-bg)] py-14">
            <div className="container mx-auto px-6 mb-8 text-center">
              {/* Stars row */}
              <div className="flex items-center justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[var(--testimonial-accent)] text-[var(--testimonial-accent)]" />
                ))}
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--testimonial-muted)]">
                {t.testimonials.trustedSeekers}
              </p>
            </div>
            {/* Override InfiniteMovingCards colors inside this dark band */}
            <div className="[&_.testimonial-card]:bg-[var(--testimonial-card)] [&_.testimonial-card]:border-[var(--testimonial-card-border)] [&_.testimonial-quote]:text-[var(--testimonial-fg)] [&_.testimonial-name]:text-[var(--testimonial-accent)] [&_.testimonial-title]:text-[var(--testimonial-muted)]">
              <InfiniteMovingCards items={jobSeekerTestimonials} direction="right" speed="slow" />
            </div>
          </div>
        </section>

        {/* ── BENTO GRID FEATURES ── */}
        <section className="container mx-auto px-6 mb-28 relative">
          <div className="text-center mb-14">
            <motion.div {...clipAnimation} className="flex justify-center">
              <SectionPill color={activeRole === 'seeker' ? 'seeker' : 'recruiter'}>
                {activeRole === 'seeker' ? 'For Job Seekers' : 'For Recruiters'}
              </SectionPill>
            </motion.div>
            <motion.h2
              {...clipAnimation}
              className="font-serif text-4xl md:text-5xl mb-5 text-[var(--primary)]"
            >
              {t.features.whyTitle}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-xl mx-auto"
            >
              {t.features.whySub}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">

            {/* Large Card: Deep Match Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`md:col-span-2 p-10 rounded-3xl border shadow-[var(--shadow-craft)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden ${
                activeRole === 'seeker'
                  ? 'bg-[var(--seeker-soft)] border-[var(--seeker-soft-border)]'
                  : 'bg-[var(--recruiter-soft)] border-[var(--recruiter-soft-border)]'
              }`}
            >
              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center h-full">
                <div className="space-y-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm bg-white ${
                    activeRole === 'seeker' ? 'text-[var(--seeker)]' : 'text-[var(--recruiter)]'
                  }`}>
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl text-[var(--primary)]">
                    {activeRole === "seeker" ? t.features.matchTitleSeeker : t.features.matchTitleRecruiter}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {activeRole === "seeker" ? t.features.matchDescSeeker : t.features.matchDescRecruiter}
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        activeRole === 'seeker' ? 'bg-[var(--seeker)]' : 'bg-[var(--recruiter)]'
                      }`} />
                      {activeRole === "seeker" ? t.features.matchBullet1Seeker : t.features.matchBullet1Recruiter}
                    </li>
                    <li className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        activeRole === 'seeker' ? 'bg-[var(--seeker)]' : 'bg-[var(--recruiter)]'
                      }`} />
                      {activeRole === "seeker" ? t.features.matchBullet2Seeker : t.features.matchBullet2Recruiter}
                    </li>
                  </ul>
                </div>

                {/* Nested Card: Mock UI */}
                <motion.div
                  className="bg-white dark:bg-[var(--card)] rounded-2xl p-5 shadow-lg border border-border transform rotate-2 group-hover:rotate-0 group-hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center font-serif font-bold text-muted-foreground text-sm">JD</div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">{t.features.targetRole}</div>
                        <div className="text-sm font-bold text-[var(--primary)]">Senior Frontend Dev</div>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeRole === 'seeker'
                        ? 'bg-[var(--feedback-green-bg)] text-[var(--feedback-green-text)]'
                        : 'bg-[var(--recruiter-soft)] text-[var(--recruiter)]'
                    }`}>85% Match</div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl border flex items-start gap-2.5 bg-[var(--feedback-red-bg)] border-[var(--feedback-red-border)]">
                      <div className="w-4 h-4 rounded-full bg-[var(--feedback-red-sub)]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[var(--feedback-red-sub)] text-[10px] font-bold">!</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold mb-0.5 text-[var(--feedback-red-text)]">{t.features.missingSkill}</div>
                        <div className="text-[11px] text-[var(--feedback-red-sub)] leading-relaxed">{t.features.missingSkillDesc}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border flex items-start gap-2.5 bg-[var(--feedback-green-bg)] border-[var(--feedback-green-border)]">
                      <div className="w-4 h-4 rounded-full bg-[var(--feedback-green-sub)]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-[var(--feedback-green-sub)]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold mb-0.5 text-[var(--feedback-green-text)]">{t.features.strongMatch}</div>
                        <div className="text-[11px] text-[var(--feedback-green-sub)] leading-relaxed">{t.features.strongMatchDesc}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Tall Card: Privacy — deep navy */}
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:row-span-2 bg-[var(--primary)] text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden group flex flex-col"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/8 transition-colors duration-500" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-[var(--accent)]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="w-12 h-12 rounded-2xl bg-white/12 flex items-center justify-center mb-7 border border-white/15">
                <Shield className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-serif text-2xl mb-3 relative z-10 text-white">
                {activeRole === "seeker" ? t.features.privacyTitleSeeker : t.features.privacyTitleRecruiter}
              </h3>
              <p className="text-base text-white/70 leading-relaxed mb-10 relative z-10">
                {activeRole === "seeker" ? t.features.privacyDescSeeker : t.features.privacyDescRecruiter}
              </p>

              <div className="mt-auto bg-white/10 rounded-2xl p-5 border border-white/15 relative z-10 group-hover:bg-white/14 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-white/80" />
                    <span className="font-medium text-white text-sm">{t.features.autoDelete}</span>
                  </div>
                  <div className="w-10 h-6 rounded-full bg-green-400 relative shadow-inner">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{t.features.autoDeleteDesc}</p>
              </div>
            </motion.div>

            {/* Medium Card: Actionable Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card p-8 rounded-3xl border border-border shadow-[var(--shadow-craft)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--icon-purple-bg)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm bg-[var(--icon-purple-bg)]">
                  <Sparkles className="w-6 h-6 text-[var(--icon-purple-text)]" />
                </div>
                <h3 className="font-serif text-xl mb-2.5 text-[var(--primary)]">
                  {activeRole === "seeker" ? t.features.feedbackTitleSeeker : t.features.feedbackTitleRecruiter}
                </h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {activeRole === "seeker" ? t.features.feedbackDescSeeker : t.features.feedbackDescRecruiter}
                </p>
                <div className="space-y-2">
                  {[t.features.feedbackItem1Seeker, t.features.feedbackItem2Seeker].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-border hover:bg-secondary transition-colors">
                      <div className="w-5 h-5 rounded-full bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</div>
                      <span className="text-sm font-medium text-foreground">
                        {activeRole === "seeker" ? (i === 0 ? t.features.feedbackItem1Seeker : t.features.feedbackItem2Seeker) : (i === 0 ? t.features.feedbackItem1Recruiter : t.features.feedbackItem2Recruiter)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Medium Card: Speed */}
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card p-8 rounded-3xl border border-border shadow-[var(--shadow-craft)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--icon-blue-bg)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm bg-[var(--icon-blue-bg)]">
                  <Clock className="w-6 h-6 text-[var(--icon-blue-text)]" />
                </div>
                <h3 className="font-serif text-xl mb-2.5 text-[var(--primary)]">
                  {activeRole === "seeker" ? t.features.speedTitleSeeker : t.features.speedTitleRecruiter}
                </h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {activeRole === "seeker" ? t.features.speedDescSeeker : t.features.speedDescRecruiter}
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-serif font-bold text-[var(--primary)]">
                    {activeRole === "seeker" ? "10s" : "10x"}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground mb-1">
                    {activeRole === "seeker" ? t.features.speedSuffixSeeker : t.features.speedSuffixRecruiter}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── WORKFLOW ── */}
        <section className="py-28 bg-[var(--surface-elevated)] border-y border-border relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <div className="flex justify-center">
                <SectionPill color="primary">How it works</SectionPill>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl mb-5 text-[var(--primary)]">{t.howItWorks.title}</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">Three simple steps to a better outcome.</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-10 relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {[
                  {
                    icon: Upload,
                    step: "01",
                    title: activeRole === "seeker" ? t.howItWorks.step1TitleSeeker : t.howItWorks.step1TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step1DescSeeker : t.howItWorks.step1DescRecruiter
                  },
                  {
                    icon: activeRole === "seeker" ? Sparkles : Search,
                    step: "02",
                    title: activeRole === "seeker" ? t.howItWorks.step2TitleSeeker : t.howItWorks.step2TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step2DescSeeker : t.howItWorks.step2DescRecruiter
                  },
                  {
                    icon: activeRole === "seeker" ? MessageCircle : ListChecks,
                    step: "03",
                    title: activeRole === "seeker" ? t.howItWorks.step3TitleSeeker : t.howItWorks.step3TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step3DescSeeker : t.howItWorks.step3DescRecruiter
                  }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="relative flex flex-col items-center text-center group"
                  >
                    {/* Step number badge */}
                    <div className="relative mb-6 z-10">
                      <div className={`w-16 h-16 rounded-full bg-white dark:bg-[var(--card)] border-2 shadow-[var(--shadow-craft)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                        activeRole === 'seeker' ? 'border-[var(--seeker)] text-[var(--seeker)]' : 'border-[var(--recruiter)] text-[var(--recruiter)]'
                      }`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                        activeRole === 'seeker' ? 'bg-[var(--seeker)]' : 'bg-[var(--recruiter)]'
                      }`}>{item.step}</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold mb-2.5 text-[var(--primary)]">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed px-3">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── RECRUITER TESTIMONIALS ── */}
        <section className="mb-28 relative overflow-hidden">
          <div className="bg-[var(--testimonial-bg)] py-14">
            <div className="container mx-auto px-6 mb-8 text-center">
              <div className="flex items-center justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[var(--testimonial-accent)] text-[var(--testimonial-accent)]" />
                ))}
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--testimonial-muted)]">
                {t.testimonials.trustedHiring}
              </p>
            </div>
            <div className="[&_.testimonial-card]:bg-[var(--testimonial-card)] [&_.testimonial-card]:border-[var(--testimonial-card-border)] [&_.testimonial-quote]:text-[var(--testimonial-fg)] [&_.testimonial-name]:text-[var(--testimonial-accent)] [&_.testimonial-title]:text-[var(--testimonial-muted)]">
              <InfiniteMovingCards items={recruiterTestimonials} direction="left" speed="slow" />
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="container mx-auto px-6 pb-28 relative">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[var(--primary)] rounded-[2.5rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/4 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[var(--accent)]/15 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 bg-white/10 text-white/80">
                    Simple Pricing
                  </span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl mb-5 text-white">{t.pricing.title}</h2>
                <p className="text-lg text-white/70 mb-14 max-w-xl mx-auto">{t.pricing.sub}</p>

                <div className="flex flex-col sm:flex-row justify-center gap-5">
                  {/* Free Plan */}
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="bg-white/10 backdrop-blur-sm text-white p-8 rounded-2xl flex-1 max-w-sm mx-auto shadow-xl transition-all duration-300 border border-white/15 group"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-2">{t.pricing.starterLabel}</div>
                    <div className="text-5xl font-serif font-bold mb-5 text-white">$0</div>
                    <ul className="text-left space-y-3.5 mb-8">
                      {[t.pricing.starterChecks, t.pricing.starterScore, t.pricing.starterSession].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-white/85">
                          <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href={ctaHref} className="block w-full py-3.5 rounded-xl bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors text-center">
                      {t.pricing.getStarted}
                    </Link>
                  </motion.div>

                  {/* Pro Plan */}
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="bg-white text-[var(--primary)] p-8 rounded-2xl flex-1 max-w-sm mx-auto shadow-2xl transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-[var(--accent)] px-4 py-1 rounded-bl-2xl text-xs font-bold text-white">{t.pricing.popular}</div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t.pricing.proLabel}</div>
                    <div className="text-5xl font-serif font-bold mb-5 text-[var(--primary)]">$12</div>
                    <ul className="text-left space-y-3.5 mb-8">
                      {[t.pricing.proChecks, t.pricing.proFeedback, t.pricing.proSupport].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-[var(--primary)]">
                          <div className="w-5 h-5 rounded-full bg-[var(--seeker-soft)] flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-[var(--seeker)]" />
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/pricing" className="block w-full py-3.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary)]/90 transition-colors text-center shadow-md">
                      {t.pricing.upgradePro}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-card border-t border-border py-14 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="font-serif text-xl font-bold text-[var(--primary)] mb-1.5">Pathwise</div>
              <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
            </div>
            <div className="flex gap-8 text-sm font-medium text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pathwise. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
