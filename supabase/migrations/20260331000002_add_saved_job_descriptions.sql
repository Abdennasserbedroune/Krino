-- Saved job descriptions library
create table if not exists public.saved_job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists saved_jds_user_id_idx on public.saved_job_descriptions(user_id);
create index if not exists saved_jds_created_at_idx on public.saved_job_descriptions(created_at desc);

-- Row Level Security
alter table public.saved_job_descriptions enable row level security;

create policy "Users can view own saved JDs"
  on public.saved_job_descriptions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved JDs"
  on public.saved_job_descriptions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved JDs"
  on public.saved_job_descriptions
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved JDs"
  on public.saved_job_descriptions
  for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger saved_jds_updated_at
  before update on public.saved_job_descriptions
  for each row execute procedure public.handle_updated_at();
