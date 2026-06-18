-- Run this ONCE in Supabase SQL Editor for project cslqtqxghgsocejvvvdb
-- https://supabase.com/dashboard/project/cslqtqxghgsocejvvvdb/sql/new
--
-- Why: an older setup used UUID columns for id/user_id, but this app uses text IDs
-- (e.g. "demo-user", "1739123456789-abc123"). That mismatch causes silent failures.
--
-- WARNING: This deletes all existing leads/contacts/batches in this project.

drop table if exists public.hubspot_sync_log cascade;
drop table if exists public.enrichment_jobs cascade;
drop table if exists public.contacts cascade;
drop table if exists public.batches cascade;
drop table if exists public.leads cascade;
drop table if exists public.workspaces cascade;

-- Workspaces
create table public.workspaces (
  id text primary key,
  slug text not null unique,
  name text not null,
  icp_config_id text not null default 'legacy-scale-models',
  owner_user_id text,
  created_at timestamptz not null default now()
);

insert into public.workspaces (id, slug, name, icp_config_id)
values ('legacy-scale-models', 'legacy-scale-models', 'Legacy Scale Models', 'legacy-scale-models')
on conflict (id) do nothing;

-- Accounts (leads)
create table public.leads (
  id text primary key,
  user_id text not null,
  workspace_id text not null default 'legacy-scale-models',
  company text not null default '',
  country text not null default 'Nederland',
  market text not null default '',
  employees integer not null default 0,
  revenue text not null default '',
  sector text not null default '',
  fit_reason text not null default '',
  website text not null default '',
  linkedin_company_url text not null default '',
  hubspot_company_id text,
  contact_name text not null default '',
  contact_title text not null default '',
  linkedin_url text not null default '',
  status text not null default 'nieuw',
  batch text not null default '',
  is_new boolean not null default true,
  notes text not null default '',
  message text not null default '',
  score integer,
  ai_message text,
  ai_summary text,
  ai_next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- DMU contacts
create table public.contacts (
  id text primary key,
  account_id text not null references public.leads(id) on delete cascade,
  user_id text not null,
  dmu_role text not null default 'marketing_brand',
  name text not null default '',
  title text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin_url text not null default '',
  hubspot_contact_id text,
  enrichment_status text not null default 'idle',
  email_confidence text,
  ai_message text,
  ai_summary text,
  ai_next_step text,
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batches (
  id text primary key,
  user_id text not null,
  workspace_id text not null default 'legacy-scale-models',
  date text not null,
  label text not null,
  lead_count integer not null default 0,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.enrichment_jobs (
  id text primary key,
  user_id text not null,
  account_id text references public.leads(id) on delete cascade,
  job_type text not null default 'account',
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.hubspot_sync_log (
  id text primary key,
  user_id text not null,
  account_id text not null,
  hubspot_company_id text,
  status text not null default 'success',
  error text,
  created_at timestamptz not null default now()
);

create index leads_user_id_idx on public.leads (user_id);
create index leads_workspace_id_idx on public.leads (workspace_id);
create index contacts_account_id_idx on public.contacts (account_id);
create index contacts_user_id_idx on public.contacts (user_id);
create index batches_user_id_idx on public.batches (user_id);

alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.batches enable row level security;
alter table public.workspaces enable row level security;
alter table public.enrichment_jobs enable row level security;
alter table public.hubspot_sync_log enable row level security;

drop policy if exists "leads_all" on public.leads;
drop policy if exists "contacts_all" on public.contacts;
drop policy if exists "batches_all" on public.batches;
drop policy if exists "workspaces_all" on public.workspaces;
drop policy if exists "enrichment_jobs_all" on public.enrichment_jobs;
drop policy if exists "hubspot_sync_log_all" on public.hubspot_sync_log;

create policy "leads_all" on public.leads for all using (true) with check (true);
create policy "contacts_all" on public.contacts for all using (true) with check (true);
create policy "batches_all" on public.batches for all using (true) with check (true);
create policy "workspaces_all" on public.workspaces for all using (true) with check (true);
create policy "enrichment_jobs_all" on public.enrichment_jobs for all using (true) with check (true);
create policy "hubspot_sync_log_all" on public.hubspot_sync_log for all using (true) with check (true);
git push -u origin claude/upbeat-meitner-tcjaqt
