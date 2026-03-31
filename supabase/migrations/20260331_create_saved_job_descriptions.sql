-- Migration: Create saved_job_descriptions table
-- Feature: JD Saved Library (Feature #4)
-- Date: 2026-03-31

create table if not exists public.saved_job_descriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  company       text not null,
  description   text not null,
  status        text not null default 'active' check (status in ('active', 'applied', 'archived')),
  match_score   numeric(4, 2) check (match_score >= 0 and match_score <= 10),
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists saved_jd_user_id_idx      on public.saved_job_descriptions (user_id);
create index if not exists saved_jd_status_idx       on public.saved_job_descriptions (user_id, status);
create index if not exists saved_jd_score_idx        on public.saved_job_descriptions (user_id, match_score desc nulls last);
create index if not exists saved_jd_created_at_idx   on public.saved_job_descriptions (user_id, created_at desc);

-- Full-text search index on title + company
create index if not exists saved_jd_fts_idx on public.saved_job_descriptions
  using gin (to_tsvector('english', title || ' ' || company || ' ' || description));

-- Auto-update updated_at on row changes
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_jd_updated_at on public.saved_job_descriptions;
create trigger saved_jd_updated_at
  before update on public.saved_job_descriptions
  for each row execute function public.update_updated_at_column();

-- Row Level Security: each user sees only their own rows
alter table public.saved_job_descriptions enable row level security;

drop policy if exists "Users can manage their own JDs" on public.saved_job_descriptions;
create policy "Users can manage their own JDs"
  on public.saved_job_descriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
