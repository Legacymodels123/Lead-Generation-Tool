-- AG Grid B2B Lead Workspace schema
-- Run in Supabase SQL Editor or via CLI migrate

-- User profiles (links to app user_id from custom auth)
create table if not exists public.profiles (
  user_id text primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- B2B lead records for the AG Grid workspace
create table if not exists public.workspace_leads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  workspace_id text not null default 'legacy-scale-models',
  company_name text not null default '',
  domain text not null default '',
  segment text not null default '',
  fleet_brand text not null default '',
  fleet_type text not null default '',
  evidence_summary text not null default '',
  evidence_url text not null default '',
  confidence text not null default 'Low' check (confidence in ('Low', 'Medium', 'High')),
  lead_fit text not null default 'Weak' check (lead_fit in ('Weak', 'Medium', 'Strong')),
  status text not null default 'New' check (status in (
    'New', 'Researching', 'Needs Validation', 'Qualified', 'Contacted', 'Rejected'
  )),
  owner text not null default '',
  next_action text not null default '',
  notes text not null default '',
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_leads_user on public.workspace_leads (user_id);
create index if not exists idx_workspace_leads_status on public.workspace_leads (status);
create index if not exists idx_workspace_leads_domain on public.workspace_leads (domain);

-- Evidence sources linked to leads
create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.workspace_leads(id) on delete cascade,
  user_id text not null,
  url text not null default '',
  title text not null default '',
  snippet text not null default '',
  source_type text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_sources_lead on public.evidence_sources (lead_id);

-- Enrichment job queue (workspace-specific)
create table if not exists public.workspace_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lead_id uuid not null references public.workspace_leads(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  provider text not null default 'mock',
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_workspace_enrichment_jobs_lead on public.workspace_enrichment_jobs (lead_id);

-- Audit trail for lead changes
create table if not exists public.workspace_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lead_id uuid references public.workspace_leads(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_audit_log_user on public.workspace_audit_log (user_id, created_at desc);

-- Auto-update updated_at
create or replace function public.set_workspace_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workspace_leads_updated_at on public.workspace_leads;
create trigger workspace_leads_updated_at
  before update on public.workspace_leads
  for each row execute function public.set_workspace_leads_updated_at();
