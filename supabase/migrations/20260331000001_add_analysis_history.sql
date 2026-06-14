-- Analysis history table for score timeline tracking
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(4,2) not null check (score >= 0 and score <= 10),
  job_title text,
  resume_snippet text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists analysis_history_user_id_idx on public.analysis_history(user_id);
create index if not exists analysis_history_analyzed_at_idx on public.analysis_history(analyzed_at desc);

-- Row Level Security
alter table public.analysis_history enable row level security;

create policy "Users can view own analysis history"
  on public.analysis_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own analysis history"
  on public.analysis_history
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own analysis history"
  on public.analysis_history
  for delete
  using (auth.uid() = user_id);
