-- Greenfield schema contract for the Company Enrichment Workspace.
-- This file is a design-ready SQL baseline for the new Supabase project.
-- Review and split into migrations in the new repository before applying.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.company_rows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  company_name text not null default '',
  domain text not null default '',
  website text not null default '',
  country text not null default '',
  city text not null default '',
  qualification_status text not null default 'new',
  sync_status text not null default 'not_synced',
  notes text not null default '',
  source text not null default 'manual',
  hubspot_company_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  label text not null,
  property_type text not null,
  source_kind text not null default 'manual',
  ai_prompt text,
  select_options jsonb not null default '[]'::jsonb,
  hubspot_property_name text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table if not exists public.property_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_row_id uuid not null references public.company_rows(id) on delete cascade,
  property_definition_id uuid not null references public.property_definitions(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date timestamptz,
  provider_source text,
  confidence_score numeric,
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_row_id, property_definition_id)
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  sort jsonb not null default '{}'::jsonb,
  visible_properties jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  encrypted_access_token text,
  encrypted_refresh_token text,
  scopes text,
  metadata jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create table if not exists public.enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_row_id uuid not null references public.company_rows(id) on delete cascade,
  property_definition_id uuid references public.property_definitions(id) on delete set null,
  provider text not null,
  run_type text not null,
  status text not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hubspot_property_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  property_definition_id uuid not null references public.property_definitions(id) on delete cascade,
  hubspot_object_type text not null default 'company',
  hubspot_property_name text not null,
  sync_direction text not null default 'two_way',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, property_definition_id, hubspot_object_type)
);

create table if not exists public.hubspot_sync_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_row_id uuid not null references public.company_rows(id) on delete cascade,
  property_definition_id uuid references public.property_definitions(id) on delete set null,
  direction text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  conflict_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.company_rows enable row level security;
alter table public.property_definitions enable row level security;
alter table public.property_values enable row level security;
alter table public.saved_views enable row level security;
alter table public.provider_connections enable row level security;
alter table public.enrichment_runs enable row level security;
alter table public.hubspot_property_mappings enable row level security;
alter table public.hubspot_sync_events enable row level security;

create policy "workspace members can read workspaces"
on public.workspaces
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

create policy "workspace members can manage their membership rows"
on public.workspace_members
for select
using (user_id = auth.uid());

create policy "workspace members can read company rows"
on public.company_rows
for select
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = company_rows.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "workspace members can modify company rows"
on public.company_rows
for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = company_rows.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = company_rows.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Apply equivalent workspace-scoped policies to the remaining workspace tables
-- when turning this contract into real migrations in the new repository.
