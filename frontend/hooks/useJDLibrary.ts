'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SavedJobDescription, SaveJDPayload, JDLibraryFilters, JobStatus } from '@/types/jd-library';

const DEFAULT_FILTERS: JDLibraryFilters = {
  search: '',
  status: 'all',
  sortBy: 'created_at',
  sortDir: 'desc',
};

export function useJDLibrary() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<SavedJobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JDLibraryFilters>(DEFAULT_FILTERS);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('saved_job_descriptions')
        .select('*')
        .eq('user_id', user.id)
        .order(filters.sortBy, { ascending: filters.sortDir === 'asc' });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.search.trim()) {
        query = query.or(
          `title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setJobs(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const saveJob = async (payload: SaveJDPayload): Promise<SavedJobDescription | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('saved_job_descriptions')
        .insert({ ...payload, user_id: user.id, tags: payload.tags ?? [] })
        .select()
        .single();

      if (insertError) throw insertError;
      setJobs((prev) => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      return null;
    }
  };

  const updateJob = async (id: string, patch: Partial<SaveJDPayload & { status: JobStatus }>): Promise<void> => {
    try {
      const { data, error: updateError } = await supabase
        .from('saved_job_descriptions')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setJobs((prev) => prev.map((j) => (j.id === id ? data : j)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    }
  };

  const deleteJob = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('saved_job_descriptions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  return {
    jobs,
    loading,
    error,
    filters,
    setFilters,
    saveJob,
    updateJob,
    deleteJob,
    refetch: fetchJobs,
  };
}
