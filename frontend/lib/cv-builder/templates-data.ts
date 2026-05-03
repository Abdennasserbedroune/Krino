// ─── Pre-filled John Doe template presets ────────────────────────────────────
// Used on the /dashboard/cv-builder new-resume picker screen.
// Each preset ships with realistic demo data and a recommended design.

import type { CvDraft, DesignSettings } from "./types";
import { DEFAULT_SECTION_ORDER } from "./types";
import { nanoid } from "nanoid";

export interface TemplatePreset {
  id: string;          // preset identifier (not a draft id)
  name: string;
  description: string;
  accentColor: string;
  primaryColor: string;
  templateId: string;
  badge?: string;      // e.g. "Most Popular"
  draft: () => CvDraft;
}

const joeBasics = {
  name: "John Doe",
  headline: "Senior Software Engineer",
  email: "john.doe@email.com",
  phone: "+1 (555) 000-1234",
  location: "San Francisco, CA",
  website: "https://johndoe.dev",
  linkedin: "https://linkedin.com/in/johndoe",
  github: "https://github.com/johndoe",
  twitter: "",
};

const joeExperience = [
  {
    id: nanoid(),
    company: "Acme Corp",
    position: "Senior Software Engineer",
    location: "San Francisco, CA",
    startDate: "2021-03",
    endDate: "",
    current: true,
    bullets: [
      "Led re-architecture of the core payments API, reducing latency by 40%.",
      "Mentored a team of 4 engineers and conducted bi-weekly code reviews.",
      "Designed and shipped a real-time notification system serving 2M+ users.",
    ],
  },
  {
    id: nanoid(),
    company: "Bright Startup",
    position: "Software Engineer",
    location: "Remote",
    startDate: "2018-06",
    endDate: "2021-02",
    current: false,
    bullets: [
      "Built a React + Node.js SaaS platform from scratch, growing to 50k MAU.",
      "Introduced CI/CD pipelines with GitHub Actions, cutting deploy time by 60%.",
    ],
  },
];

const joeEducation = [
  {
    id: nanoid(),
    institution: "University of California, Berkeley",
    degree: "B.Sc.",
    field: "Computer Science",
    location: "Berkeley, CA",
    startDate: "2014-09",
    endDate: "2018-05",
    current: false,
    gpa: "3.8",
    bullets: [],
  },
];

const joeSkills = [
  { id: nanoid(), category: "Languages",   items: ["TypeScript", "Python", "Go", "SQL"] },
  { id: nanoid(), category: "Frontend",    items: ["React", "Next.js", "Tailwind CSS", "Figma"] },
  { id: nanoid(), category: "Backend",     items: ["Node.js", "FastAPI", "PostgreSQL", "Redis"] },
  { id: nanoid(), category: "DevOps",      items: ["Docker", "Kubernetes", "AWS", "CI/CD"] },
];

const joeProjects = [
  {
    id: nanoid(),
    name: "OpenDash",
    description: "Open-source analytics dashboard with real-time charts.",
    url: "https://opendash.io",
    repoUrl: "https://github.com/johndoe/opendash",
    techStack: ["Next.js", "Prisma", "Recharts", "Vercel"],
    startDate: "2023-01",
    endDate: "",
    current: true,
    bullets: [
      "2.4k GitHub stars; featured in Next.js weekly newsletter.",
      "Built plugin system allowing 3rd-party chart integrations.",
    ],
  },
];

const joeCerts = [
  { id: nanoid(), name: "AWS Solutions Architect – Associate", issuer: "Amazon Web Services", date: "2023-06", expirationDate: "2026-06", credentialId: "AWS-SAA-001", url: "" },
  { id: nanoid(), name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2022-11", expirationDate: "2025-11", credentialId: "CKA-002", url: "" },
];

const joeLanguages = [
  { id: nanoid(), language: "English", level: "native" as const },
  { id: nanoid(), language: "Spanish", level: "intermediate" as const },
];

const baseDraftData = {
  basics: joeBasics,
  summary: { content: "Results-driven software engineer with 6+ years of experience building scalable web applications and APIs. Passionate about developer experience, clean architecture, and open-source software." },
  experience: joeExperience,
  education: joeEducation,
  skills: joeSkills,
  projects: joeProjects,
  certifications: joeCerts,
  languages: joeLanguages,
  volunteer: [],
  awards: [],
  publications: [],
  references: [],
  customSections: [],
};

function makeDesign(overrides: Partial<DesignSettings>): DesignSettings {
  return {
    template: "classic",
    primaryColor: "#111111",
    accentColor: "#3b82f6",
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 1.5,
    marginTop: 18,
    marginSide: 18,
    paperSize: "A4",
    showIcons: true,
    showBorder: false,
    ...overrides,
  };
}

function makeDraft(design: DesignSettings): CvDraft {
  return {
    id: "",
    userId: "",
    title: "My Resume",
    data: baseDraftData,
    design,
    sectionOrder: DEFAULT_SECTION_ORDER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean serif-inspired layout. Timeless and ATS-safe.",
    accentColor: "#2563eb",
    primaryColor: "#111111",
    templateId: "classic",
    draft: () => makeDraft(makeDesign({ template: "classic", accentColor: "#2563eb" })),
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold header with accent lines. Great for tech roles.",
    accentColor: "#7c3aed",
    primaryColor: "#0f172a",
    templateId: "modern",
    badge: "Most Popular",
    draft: () => makeDraft(makeDesign({ template: "modern", primaryColor: "#0f172a", accentColor: "#7c3aed" })),
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Ultra-clean whitespace-first design. Lets content shine.",
    accentColor: "#16a34a",
    primaryColor: "#1a1a1a",
    templateId: "minimal",
    draft: () => makeDraft(makeDesign({ template: "minimal", primaryColor: "#1a1a1a", accentColor: "#16a34a" })),
  },
  {
    id: "executive",
    name: "Executive",
    description: "Sophisticated two-line header, ideal for leadership roles.",
    accentColor: "#b45309",
    primaryColor: "#1c1917",
    templateId: "executive",
    draft: () => makeDraft(makeDesign({ template: "executive", primaryColor: "#1c1917", accentColor: "#b45309" })),
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Two-column layout with a color sidebar for contact info.",
    accentColor: "#0369a1",
    primaryColor: "#0c1a2e",
    templateId: "sidebar",
    badge: "New",
    draft: () => makeDraft(makeDesign({ template: "sidebar", primaryColor: "#0c1a2e", accentColor: "#0369a1" })),
  },
  {
    id: "creative",
    name: "Creative",
    description: "Vibrant accent colors and section dividers. Stand out.",
    accentColor: "#db2777",
    primaryColor: "#18181b",
    templateId: "creative",
    draft: () => makeDraft(makeDesign({ template: "creative", primaryColor: "#18181b", accentColor: "#db2777" })),
  },
];
