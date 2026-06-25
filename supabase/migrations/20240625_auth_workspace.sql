-- Phase 2: workspace bootstrap helpers (idempotent)

alter table public.workspaces add column if not exists config jsonb default '{"apiKeys":{}, "columns":[], "leadStatuses":["qualified","not_qualified"]}'::jsonb;

create table if not exists public.profiles (
  user_id text primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_user_active
  on public.team_members (user_id)
  where status = 'active';

create index if not exists idx_leads_user_workspace
  on public.leads (user_id, workspace_id);
