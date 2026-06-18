-- Lead Generation Tool — Supabase schema
-- Run in Supabase SQL Editor

-- Workspaces (multi-tenant ICP configs)
create table if not exists public.workspaces (
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

-- Accounts (extends leads table concept)
create table if not exists public.leads (
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

-- DMU contacts per account
create table if not exists public.contacts (
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

create table if not exists public.batches (
  id text primary key,
  user_id text not null,
  workspace_id text not null default 'legacy-scale-models',
  date text not null,
  label text not null,
  lead_count integer not null default 0,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.enrichment_jobs (
  id text primary key,
  user_id text not null,
  account_id text references public.leads(id) on delete cascade,
  job_type text not null default 'account',
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.hubspot_sync_log (
  id text primary key,
  user_id text not null,
  account_id text not null,
  hubspot_company_id text,
  status text not null default 'success',
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id text primary key,
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Workspace configuration (API keys, columns, settings)
alter table public.workspaces add column if not exists config jsonb default '{"apiKeys":{}, "columns":[], "leadStatuses":["qualified","not_qualified"]}'::jsonb;

-- Lead source tracking
alter table public.leads add column if not exists source text default 'manual';
alter table public.leads add column if not exists legacy_status text;
alter table public.leads add column if not exists ai_qualification_score integer;


-- Migration for existing projects
alter table public.leads add column if not exists workspace_id text not null default 'legacy-scale-models';
alter table public.leads add column if not exists market text not null default '';
alter table public.leads add column if not exists fit_reason text not null default '';
alter table public.leads add column if not exists website text not null default '';
alter table public.leads add column if not exists linkedin_company_url text not null default '';
alter table public.leads add column if not exists hubspot_company_id text;
alter table public.batches add column if not exists workspace_id text not null default 'legacy-scale-models';
alter table public.leads add column if not exists ai_message text;
alter table public.leads add column if not exists ai_summary text;
alter table public.leads add column if not exists ai_next_step text;

-- Migrate legacy status to qualified/not_qualified (initial migration)
update public.leads set
  legacy_status = status,
  status = case
    when status in ('verstuurd', 'opvolgen', 'gewonnen') then 'qualified'
    else 'not_qualified'
  end,
  ai_qualification_score = case
    when status = 'gewonnen' then 90
    when status = 'opvolgen' then 70
    when status = 'verstuurd' then 60
    else 30
  end
where legacy_status is null;

create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_workspace_id_idx on public.leads (workspace_id);
create index if not exists contacts_account_id_idx on public.contacts (account_id);
create index if not exists contacts_user_id_idx on public.contacts (user_id);
create index if not exists batches_user_id_idx on public.batches (user_id);

alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.batches enable row level security;
alter table public.workspaces enable row level security;
alter table public.enrichment_jobs enable row level security;
alter table public.hubspot_sync_log enable row level security;
alter table public.user_settings enable row level security;

create policy "user_settings_all" on public.user_settings for all using (true) with check (true);

create policy "leads_all" on public.leads for all using (true) with check (true);
create policy "contacts_all" on public.contacts for all using (true) with check (true);
create policy "batches_all" on public.batches for all using (true) with check (true);
create policy "workspaces_all" on public.workspaces for all using (true) with check (true);
create policy "enrichment_jobs_all" on public.enrichment_jobs for all using (true) with check (true);
create policy "hubspot_sync_log_all" on public.hubspot_sync_log for all using (true) with check (true);
