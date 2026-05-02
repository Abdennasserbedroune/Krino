// ─── CV Builder Types ────────────────────────────────────────────────────────
// JSON Resume spec-compatible + Pathwise extensions

export type SectionKey =
  | "basics"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "volunteer"
  | "awards"
  | "publications"
  | "references"
  | "custom";

// ─── Basics ──────────────────────────────────────────────────────────────────
export interface CvBasics {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  twitter: string;
}

// ─── Summary ─────────────────────────────────────────────────────────────────
export interface CvSummary {
  content: string;
}

// ─── Experience ──────────────────────────────────────────────────────────────
export interface CvExperienceItem {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

// ─── Education ───────────────────────────────────────────────────────────────
export interface CvEducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa: string;
  bullets: string[];
}

// ─── Skills ──────────────────────────────────────────────────────────────────
export interface CvSkillGroup {
  id: string;
  category: string;
  items: string[];
}

// ─── Projects ────────────────────────────────────────────────────────────────
export interface CvProjectItem {
  id: string;
  name: string;
  description: string;
  url: string;
  repoUrl: string;
  techStack: string[];
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

// ─── Certifications ──────────────────────────────────────────────────────────
export interface CvCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate: string;
  credentialId: string;
  url: string;
}

// ─── Languages ───────────────────────────────────────────────────────────────
export type LanguageLevel =
  | "native"
  | "fluent"
  | "advanced"
  | "intermediate"
  | "beginner";

export interface CvLanguageItem {
  id: string;
  language: string;
  level: LanguageLevel;
}

// ─── Volunteer ───────────────────────────────────────────────────────────────
export interface CvVolunteerItem {
  id: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

// ─── Awards ──────────────────────────────────────────────────────────────────
export interface CvAwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

// ─── Publications ────────────────────────────────────────────────────────────
export interface CvPublicationItem {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  description: string;
}

// ─── References ──────────────────────────────────────────────────────────────
export interface CvReferenceItem {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
}

// ─── Custom Section ──────────────────────────────────────────────────────────
export interface CvCustomItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  bullets: string[];
}

export interface CvCustomSection {
  id: string;
  heading: string;
  items: CvCustomItem[];
  visible: boolean;
}

// ─── Section Metadata ────────────────────────────────────────────────────────
export interface SectionMeta {
  key: SectionKey;
  label: string;
  visible: boolean;
  order: number;
}

// ─── Design Settings ─────────────────────────────────────────────────────────
export type TemplateId = "classic" | "modern" | "minimal";
export type PaperSize = "A4" | "Letter";

export interface DesignSettings {
  template: TemplateId;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;       // pt, 8–14
  lineHeight: number;     // 1.0–2.0
  marginTop: number;      // mm
  marginSide: number;     // mm
  paperSize: PaperSize;
  showIcons: boolean;
  showBorder: boolean;
}

// ─── Full Draft ───────────────────────────────────────────────────────────────
export interface CvDraftData {
  basics: CvBasics;
  summary: CvSummary;
  experience: CvExperienceItem[];
  education: CvEducationItem[];
  skills: CvSkillGroup[];
  projects: CvProjectItem[];
  certifications: CvCertificationItem[];
  languages: CvLanguageItem[];
  volunteer: CvVolunteerItem[];
  awards: CvAwardItem[];
  publications: CvPublicationItem[];
  references: CvReferenceItem[];
  customSections: CvCustomSection[];
}

export interface CvDraft {
  id: string;
  userId: string;
  title: string;
  data: CvDraftData;
  design: DesignSettings;
  sectionOrder: SectionMeta[];
  createdAt: string;
  updatedAt: string;
}

// ─── Empty defaults ───────────────────────────────────────────────────────────
export const EMPTY_BASICS: CvBasics = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  github: "",
  twitter: "",
};

export const DEFAULT_DESIGN: DesignSettings = {
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
};

export const DEFAULT_SECTION_ORDER: SectionMeta[] = [
  { key: "basics",        label: "Personal Info",   visible: true, order: 0 },
  { key: "summary",       label: "Summary",          visible: true, order: 1 },
  { key: "experience",    label: "Experience",       visible: true, order: 2 },
  { key: "education",     label: "Education",        visible: true, order: 3 },
  { key: "skills",        label: "Skills",           visible: true, order: 4 },
  { key: "projects",      label: "Projects",         visible: true, order: 5 },
  { key: "certifications",label: "Certifications",   visible: true, order: 6 },
  { key: "languages",     label: "Languages",        visible: true, order: 7 },
  { key: "volunteer",     label: "Volunteer",        visible: false, order: 8 },
  { key: "awards",        label: "Awards",           visible: false, order: 9 },
  { key: "publications",  label: "Publications",     visible: false, order: 10 },
  { key: "references",    label: "References",       visible: false, order: 11 },
  { key: "custom",        label: "Custom Section",   visible: false, order: 12 },
];

export const EMPTY_DRAFT_DATA: CvDraftData = {
  basics: EMPTY_BASICS,
  summary: { content: "" },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  volunteer: [],
  awards: [],
  publications: [],
  references: [],
  customSections: [],
};
