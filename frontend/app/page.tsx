"use client";

import Link from "next/link";
import { ArrowRight, Check, Upload, FileText, Search, Shield, Clock, Users, Briefcase, Lock, Sparkles, ChevronRight, MessageCircle, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { useAuth } from "@/lib/auth/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-white overflow-x-hidden relative">

      <header className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-serif text-3xl font-bold tracking-tight text-primary select-none cursor-default">Pathwise</div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user ? (
              <Link
                href={getDashboardPath()}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.dashboard}
              </Link>
            ) : (
              <Link href="/auth/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.signIn}
              </Link>
            )}
            <Link
              href={ctaHref}
              className={`relative group px-6 py-2.5 rounded-full overflow-hidden font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-white ${activeRole === 'seeker' ? 'bg-seeker' : 'bg-recruiter'}`}
            >
              <span className="relative z-10">{t.nav.getStarted}</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 relative">
        {/* Hero Section */}
        <section className="container mx-auto px-6 mb-20 relative">
          <div className="max-w-5xl mx-auto text-center">

            {/* Role Toggle */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-craft mb-12 border border-border/50"
            >
              <button
                onClick={() => setActiveRole("seeker")}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeRole === 'seeker' ? 'bg-seeker text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                {t.hero.roleSeeker}
              </button>
              <button
                onClick={() => setActiveRole("recruiter")}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeRole === 'recruiter' ? 'bg-recruiter text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                {t.hero.roleRecruiter}
              </button>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="space-y-8"
              >
                <h1 className="font-serif text-6xl md:text-8xl leading-[1] tracking-tight text-primary">
                  {activeRole === "seeker" ? (
                    <>
                      {t.hero.headlineSeeker.split(t.hero.gradientSeeker)[0]}<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-seeker to-blue-400 italic inline-block py-2 px-1 pr-4">{t.hero.gradientSeeker}</span>
                    </>
                  ) : (
                    <>
                      {t.hero.headlineRecruiterLine1} <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-recruiter to-orange-400 italic inline-block py-2 px-1 pr-4">{t.hero.gradientRecruiter}</span>
                    </>
                  )}
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                  {activeRole === "seeker" ? t.hero.subSeeker : t.hero.subRecruiter}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                  <Link
                    href={ctaHref}
                    className={`px-8 py-4 rounded-full text-lg font-bold text-white shadow-glow hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${activeRole === 'seeker' ? 'bg-seeker' : 'bg-recruiter'}`}
                  >
                    {activeRole === "seeker" ? t.hero.ctaSeeker : t.hero.ctaRecruiter}
                  </Link>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{t.hero.freeChecks}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Job Seeker Testimonials Marquee */}
        <section className="mb-32 overflow-hidden py-10 relative">
          <div className="container mx-auto px-6 mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.testimonials.trustedSeekers}</p>
          </div>
          <InfiniteMovingCards items={jobSeekerTestimonials} direction="right" speed="slow" />
        </section>

        {/* Bento Grid Features */}
        <section className="container mx-auto px-6 mb-32 relative">
          <div className="text-center mb-16">
            <motion.h2
              {...clipAnimation}
              className="font-serif text-4xl md:text-5xl mb-6 text-primary"
            >
              {t.features.whyTitle}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground"
            >
              {t.features.whySub}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">

            {/* Large Card: Deep Match Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`md:col-span-2 p-10 rounded-[2.5rem] border border-white/40 shadow-craft hover:shadow-card-hover hover:-translate-y-1 transition-transform transition-shadow duration-150 group relative overflow-hidden ${activeRole === 'seeker' ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/80' : 'bg-gradient-to-br from-orange-50/80 to-amber-50/80'}`}
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center h-full">
                <div className="space-y-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${activeRole === 'seeker' ? 'bg-white text-seeker shadow-blue-200' : 'bg-white text-recruiter shadow-orange-200'}`}>
                    <Search className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-3xl text-primary">
                    {activeRole === "seeker" ? t.features.matchTitleSeeker : t.features.matchTitleRecruiter}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {activeRole === "seeker" ? t.features.matchDescSeeker : t.features.matchDescRecruiter}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeRole === 'seeker' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                      {activeRole === "seeker" ? t.features.matchBullet1Seeker : t.features.matchBullet1Recruiter}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeRole === 'seeker' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                      {activeRole === "seeker" ? t.features.matchBullet2Seeker : t.features.matchBullet2Recruiter}
                    </li>
                  </ul>
                </div>

                {/* Nested Card: Mock UI */}
                <motion.div
                  className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50 transform rotate-2 group-hover:rotate-0 group-hover:scale-[1.02] transition-transform transition-shadow duration-150"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-serif font-bold text-gray-500">JD</div>
                      <div>
                        <div className="text-xs font-bold uppercase text-muted-foreground">{t.features.targetRole}</div>
                        <div className="text-sm font-bold text-primary">Senior Frontend Dev</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${activeRole === 'seeker' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      85% Match
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-red-600 text-xs font-bold">!</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-800 mb-1">{t.features.missingSkill}</div>
                        <div className="text-xs text-red-600">{t.features.missingSkillDesc}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-green-800 mb-1">{t.features.strongMatch}</div>
                        <div className="text-xs text-green-600">{t.features.strongMatchDesc}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Tall Card: Privacy */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:row-span-2 bg-primary text-primary-foreground p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group flex flex-col"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-500"></div>
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 backdrop-blur-sm border border-white/10">
                <Shield className="w-7 h-7 text-white" />
              </div>

              <h3 className="font-serif text-3xl mb-4 relative z-10">
                {activeRole === "seeker" ? t.features.privacyTitleSeeker : t.features.privacyTitleRecruiter}
              </h3>
              <p className="text-lg text-white/70 leading-relaxed mb-12 relative z-10">
                {activeRole === "seeker" ? t.features.privacyDescSeeker : t.features.privacyDescRecruiter}
              </p>

              {/* Nested Card: Privacy Toggle */}
              <div className="mt-auto bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 relative z-10 group-hover:bg-white/15 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-white/80" />
                    <span className="font-medium">{t.features.autoDelete}</span>
                  </div>
                  <div className="w-10 h-6 rounded-full bg-green-500 relative shadow-inner">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm"></div>
                  </div>
                </div>
                <p className="text-xs text-white/50">{t.features.autoDeleteDesc}</p>
              </div>
            </motion.div>

            {/* Medium Card: Actionable Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/60 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/40 shadow-craft hover:shadow-card-hover transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Sparkles className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-serif text-2xl mb-3 text-primary">
                  {activeRole === "seeker" ? t.features.feedbackTitleSeeker : t.features.feedbackTitleRecruiter}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {activeRole === "seeker" ? t.features.feedbackDescSeeker : t.features.feedbackDescRecruiter}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 border border-white/50 hover:bg-white transition-colors">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">1</div>
                    <span className="text-sm font-medium">
                      {activeRole === "seeker" ? t.features.feedbackItem1Seeker : t.features.feedbackItem1Recruiter}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 border border-white/50 hover:bg-white transition-colors">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</div>
                    <span className="text-sm font-medium">
                      {activeRole === "seeker" ? t.features.feedbackItem2Seeker : t.features.feedbackItem2Recruiter}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium Card: Team/Speed */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/60 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/40 shadow-craft hover:shadow-card-hover transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Clock className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-serif text-2xl mb-3 text-primary">
                  {activeRole === "seeker" ? t.features.speedTitleSeeker : t.features.speedTitleRecruiter}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {activeRole === "seeker" ? t.features.speedDescSeeker : t.features.speedDescRecruiter}
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-serif font-bold text-primary">
                    {activeRole === "seeker" ? "10s" : "10x"}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground mb-1.5">
                    {activeRole === "seeker" ? t.features.speedSuffixSeeker : t.features.speedSuffixRecruiter}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-32 bg-white/50 backdrop-blur-sm border-y border-border/50 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="font-serif text-5xl mb-6 text-primary">{t.howItWorks.title}</h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-12 relative">
                <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-border/50"></div>

                {[
                  {
                    icon: Upload,
                    title: activeRole === "seeker" ? t.howItWorks.step1TitleSeeker : t.howItWorks.step1TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step1DescSeeker : t.howItWorks.step1DescRecruiter
                  },
                  {
                    icon: activeRole === "seeker" ? Sparkles : Search,
                    title: activeRole === "seeker" ? t.howItWorks.step2TitleSeeker : t.howItWorks.step2TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step2DescSeeker : t.howItWorks.step2DescRecruiter
                  },
                  {
                    icon: activeRole === "seeker" ? MessageCircle : ListChecks,
                    title: activeRole === "seeker" ? t.howItWorks.step3TitleSeeker : t.howItWorks.step3TitleRecruiter,
                    desc: activeRole === "seeker" ? t.howItWorks.step3DescSeeker : t.howItWorks.step3DescRecruiter
                  }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="relative flex flex-col items-center text-center group"
                  >
                    <div className={`w-16 h-16 rounded-full bg-background border-4 border-white shadow-xl flex items-center justify-center mb-8 z-10 group-hover:scale-110 transition-transform duration-300 ${activeRole === 'seeker' ? 'text-seeker' : 'text-recruiter'}`}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-3 text-primary">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed px-4">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Recruiter Testimonials Marquee */}
        <section className="mb-32 overflow-hidden py-10 relative">
          <div className="container mx-auto px-6 mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.testimonials.trustedHiring}</p>
          </div>
          <InfiniteMovingCards items={recruiterTestimonials} direction="left" speed="slow" />
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-6 pb-32 relative">
          <div className="max-w-4xl mx-auto">
            <div className="bg-primary rounded-[3rem] p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10">
                <h2 className="font-serif text-4xl md:text-5xl mb-6">{t.pricing.title}</h2>
                <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">{t.pricing.sub}</p>

                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  {/* Free Plan */}
                  <motion.div
                    whileHover={{ y: -10 }}
                    className="bg-white text-primary p-8 rounded-3xl flex-1 max-w-sm mx-auto shadow-xl transition-all duration-300 relative group"
                  >
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{t.pricing.starterLabel}</div>
                    <div className="text-5xl font-serif font-bold mb-4">$0</div>
                    <ul className="text-left space-y-4 mb-8">
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={12} /></div> {t.pricing.starterChecks}</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={12} /></div> {t.pricing.starterScore}</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={12} /></div> {t.pricing.starterSession}</li>
                    </ul>
                    <Link href={ctaHref} className="block w-full py-4 rounded-2xl bg-secondary text-primary font-bold hover:bg-secondary/80 transition-colors">
                      {t.pricing.getStarted}
                    </Link>
                  </motion.div>

                  {/* Pro Plan */}
                  <motion.div
                    whileHover={{ y: -10 }}
                    className="bg-gradient-to-br from-accent to-orange-600 text-white p-8 rounded-3xl flex-1 max-w-sm mx-auto shadow-xl transition-all duration-300 border border-white/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-white/20 px-4 py-1 rounded-bl-2xl text-xs font-bold backdrop-blur-sm">{t.pricing.popular}</div>
                    <div className="text-sm font-bold uppercase tracking-wider text-white/80 mb-2">{t.pricing.proLabel}</div>
                    <div className="text-5xl font-serif font-bold mb-4">$12</div>
                    <ul className="text-left space-y-4 mb-8">
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Check size={12} /></div> {t.pricing.proChecks}</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Check size={12} /></div> {t.pricing.proFeedback}</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Check size={12} /></div> {t.pricing.proSupport}</li>
                    </ul>
                    <Link href="/pricing" className="block w-full py-4 rounded-2xl bg-white text-accent font-bold hover:bg-gray-50 transition-colors shadow-lg">
                      {t.pricing.upgradePro}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border/50 py-16 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="font-serif text-2xl font-bold text-primary mb-2">Pathwise</div>
              <p className="text-muted-foreground">{t.footer.tagline}</p>
            </div>
            <div className="flex gap-8 text-sm font-medium text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">{t.footer.privacy}</Link>
              <Link href="#" className="hover:text-primary transition-colors">{t.footer.terms}</Link>
              <Link href="#" className="hover:text-primary transition-colors">{t.footer.twitter}</Link>
            </div>
          </div>
          <div className="mt-12 text-center text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Pathwise AI. {t.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
}
