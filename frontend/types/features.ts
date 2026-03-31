// Types for new Pathwise features

export interface AnalysisHistoryEntry {
  id: string;
  user_id: string;
  score: number;
  job_title?: string;
  resume_snippet?: string;
  analyzed_at: string;
  created_at: string;
}

export interface SavedJobDescription {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type CoverLetterTone = "formal" | "confident" | "creative";

export interface CoverLetterRequest {
  resumeText: string;
  jobDescription: string;
  tone: CoverLetterTone;
}

export interface CoverLetterResponse {
  coverLetter: string;
}

export interface KeywordDiffResult {
  present: string[];
  missing: string[];
  matchPercent: number;
}

export type OnboardingStep = "upload" | "paste_jd" | "analyze" | "coach";

export interface OnboardingState {
  completed: OnboardingStep[];
  dismissed: boolean;
}
