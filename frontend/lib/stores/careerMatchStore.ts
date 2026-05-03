/**
 * Career Match — client-side persistent store (Zustand).
 * State lives in memory for the browser session.
 * Cleared only when the user explicitly clicks Reset.
 */
import { create } from "zustand";

export interface CvItem {
  id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  score: number | null;
  analyzed_at: string | null;
}

export interface MatchResult {
  cv_id: number;
  file_name: string;
  match_score: number;
  skills_match_score: number;
  experience_score: number;
  cv_quality_score: number;
  overall_verdict: string;
  hire_probability: string;
  overall_reason: string;
  strengths: string[];
  gaps: string[];
  actionable_advice: string[];
  roadmap: string[];
  application_ready: boolean;
  job_requirements?: {
    required_skills?: string[];
    nice_to_have?: string[];
    seniority_level?: string;
    experience_years?: string;
    key_responsibilities?: string[];
  };
}

interface CareerMatchState {
  // Form
  category: string;
  jobTitle: string;
  expLevel: string;
  skills: string;
  description: string;
  // CVs
  cvs: CvItem[];
  selectedCv: number | null;
  // Result
  result: MatchResult | null;
  activeTab: "overview" | "gaps" | "strengths" | "roadmap";
  // Actions
  setCategory: (v: string) => void;
  setJobTitle: (v: string) => void;
  setExpLevel: (v: string) => void;
  setSkills: (v: string) => void;
  setDescription: (v: string) => void;
  setCvs: (cvs: CvItem[]) => void;
  addCv: (cv: CvItem) => void;
  removeCv: (id: number) => void;
  setSelectedCv: (id: number | null) => void;
  setResult: (r: MatchResult | null) => void;
  setActiveTab: (t: "overview" | "gaps" | "strengths" | "roadmap") => void;
  reset: () => void;
}

const INITIAL: Omit<CareerMatchState, keyof { [K in keyof CareerMatchState]: CareerMatchState[K] extends Function ? K : never }> = {
  category: "",
  jobTitle: "",
  expLevel: "",
  skills: "",
  description: "",
  cvs: [],
  selectedCv: null,
  result: null,
  activeTab: "overview",
};

export const useCareerMatchStore = create<CareerMatchState>((set) => ({
  category: "",
  jobTitle: "",
  expLevel: "",
  skills: "",
  description: "",
  cvs: [],
  selectedCv: null,
  result: null,
  activeTab: "overview",

  setCategory:   (v) => set({ category: v }),
  setJobTitle:   (v) => set({ jobTitle: v }),
  setExpLevel:   (v) => set({ expLevel: v }),
  setSkills:     (v) => set({ skills: v }),
  setDescription:(v) => set({ description: v }),
  setCvs:        (cvs) => set({ cvs }),
  addCv:         (cv) => set((s) => ({ cvs: [cv, ...s.cvs] })),
  removeCv:      (id) => set((s) => ({ cvs: s.cvs.filter((c) => c.id !== id), selectedCv: s.selectedCv === id ? null : s.selectedCv })),
  setSelectedCv: (id) => set({ selectedCv: id }),
  setResult:     (r)  => set({ result: r, activeTab: "overview" }),
  setActiveTab:  (t)  => set({ activeTab: t }),
  reset: () => set({
    category: "", jobTitle: "", expLevel: "", skills: "", description: "",
    selectedCv: null, result: null, activeTab: "overview",
  }),
}));
