export type JobStatus = 'active' | 'applied' | 'archived';

export interface SavedJobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string;
  description: string;
  status: JobStatus;
  match_score?: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SaveJDPayload {
  title: string;
  company: string;
  description: string;
  status?: JobStatus;
  tags?: string[];
}

export interface JDLibraryFilters {
  search: string;
  status: JobStatus | 'all';
  sortBy: 'created_at' | 'match_score' | 'company';
  sortDir: 'asc' | 'desc';
}
