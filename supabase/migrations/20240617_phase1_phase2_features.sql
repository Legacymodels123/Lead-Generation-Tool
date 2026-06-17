-- Phase 1 & 2: Database Schema Enhancements
-- Adds team management, workspace settings, usage analytics, custom columns, integrations, and DMU sketches

-- 1. Team Members Table
create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  user_id uuid,
  role text not null default 'member', -- 'admin' or 'member'
  status text not null default 'active', -- 'active', 'invited', 'removed'
  invitation_token text,
  invitation_expires_at timestamp with time zone,
  added_at timestamp with time zone default now(),
  invited_by uuid,
  email text,
  name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint team_members_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  constraint team_members_user_id_fk foreign key (user_id) references auth.users(id),
  unique(workspace_id, email) -- Email unique within workspace
);

create index if not exists idx_team_members_workspace on team_members(workspace_id);
create index if not exists idx_team_members_user on team_members(user_id);
create index if not exists idx_team_members_status on team_members(status);

-- 2. Workspace Settings Table
create table if not exists workspace_settings (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null unique,
  rate_limit_monthly integer default 10000,
  api_quota integer default 5000,
  max_custom_columns integer default 20,
  storage_limit_gb integer default 10,
  max_team_members integer default 5,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint workspace_settings_workspace_id_fk foreign key (workspace_id) references workspaces(id)
);

create index if not exists idx_workspace_settings_workspace on workspace_settings(workspace_id);

-- 3. Usage Analytics Table
create table if not exists usage_analytics (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  user_id uuid,
  date date not null,
  leads_created integer default 0,
  leads_enriched integer default 0,
  api_calls_used integer default 0,
  credits_spent integer default 0,
  created_at timestamp with time zone default now(),

  constraint usage_analytics_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  constraint usage_analytics_user_id_fk foreign key (user_id) references auth.users(id),
  unique(workspace_id, user_id, date)
);

create index if not exists idx_usage_analytics_workspace on usage_analytics(workspace_id);
create index if not exists idx_usage_analytics_date on usage_analytics(date);
create index if not exists idx_usage_analytics_user on usage_analytics(user_id);

-- 4. Custom Columns Table
create table if not exists custom_columns (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  key text not null,
  label text not null,
  type text not null, -- 'text', 'number', 'date', 'select', 'email', 'url'
  visible boolean default true,
  "order" integer default 0,
  default_value text,
  select_options text[], -- JSON array for select types
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint custom_columns_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  unique(workspace_id, key)
);

create index if not exists idx_custom_columns_workspace on custom_columns(workspace_id);
create index if not exists idx_custom_columns_order on custom_columns("order");

-- 5. Column Mappings Table (for import/export)
create table if not exists column_mappings (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  source_field text not null,
  target_column_key text not null,
  created_at timestamp with time zone default now(),

  constraint column_mappings_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  unique(workspace_id, source_field)
);

create index if not exists idx_column_mappings_workspace on column_mappings(workspace_id);

-- 6. Import/Export Jobs Table
create table if not exists import_export_jobs (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  user_id uuid not null,
  type text not null, -- 'import' or 'export'
  status text not null default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_path text,
  progress integer default 0,
  total_items integer default 0,
  processed_items integer default 0,
  failed_items integer default 0,
  error text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,

  constraint import_export_jobs_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  constraint import_export_jobs_user_id_fk foreign key (user_id) references auth.users(id)
);

create index if not exists idx_import_export_jobs_workspace on import_export_jobs(workspace_id);
create index if not exists idx_import_export_jobs_user on import_export_jobs(user_id);
create index if not exists idx_import_export_jobs_status on import_export_jobs(status);

-- 7. Integration Connections Table
create table if not exists integration_connections (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  user_id uuid not null,
  provider text not null, -- 'linkedin', 'hubspot', 'salesnavigator'
  status text not null default 'pending', -- 'connected', 'pending', 'expired', 'error'
  access_token text,
  refresh_token text,
  scopes text,
  expires_at timestamp with time zone,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint integration_connections_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  constraint integration_connections_user_id_fk foreign key (user_id) references auth.users(id),
  unique(workspace_id, user_id, provider)
);

create index if not exists idx_integration_connections_workspace on integration_connections(workspace_id);
create index if not exists idx_integration_connections_provider on integration_connections(provider);
create index if not exists idx_integration_connections_status on integration_connections(status);

-- 8. DMU Sketches Table
create table if not exists dmu_sketches (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  lead_id text not null,
  nodes jsonb not null default '[]', -- Array of DMUNode objects
  edges jsonb not null default '[]', -- Array of DMUEdge objects
  svg_data text,
  ai_insights text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint dmu_sketches_workspace_id_fk foreign key (workspace_id) references workspaces(id),
  unique(workspace_id, lead_id)
);

create index if not exists idx_dmu_sketches_workspace on dmu_sketches(workspace_id);
create index if not exists idx_dmu_sketches_lead on dmu_sketches(lead_id);

-- 9. Add columns to existing tables

-- Add to leads table if not exists
alter table leads add column if not exists custom_column_values jsonb default '{}';
alter table leads add column if not exists dmu_sketch_id uuid references dmu_sketches(id);

-- Add to contacts table if not exists
alter table contacts add column if not exists linkedin_sales_nav_id text;

-- Add to workspaces table if not exists
alter table workspaces add column if not exists max_team_members integer default 5;

-- 10. Enable RLS (Row Level Security) for new tables

alter table team_members enable row level security;
alter table workspace_settings enable row level security;
alter table usage_analytics enable row level security;
alter table custom_columns enable row level security;
alter table column_mappings enable row level security;
alter table import_export_jobs enable row level security;
alter table integration_connections enable row level security;
alter table dmu_sketches enable row level security;

-- 11. RLS Policies - Allow workspace members to see their own data

-- Team Members RLS
create policy "Users can view team members of their workspace"
  on team_members for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = team_members.workspace_id and status = 'active'
    )
  );

create policy "Workspace admins can manage team members"
  on team_members for all
  using (
    auth.uid() in (
      select user_id from team_members
      where workspace_id = team_members.workspace_id and role = 'admin' and status = 'active'
    )
  );

-- Workspace Settings RLS
create policy "Users can view their workspace settings"
  on workspace_settings for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = workspace_settings.workspace_id and status = 'active'
    )
  );

-- Usage Analytics RLS
create policy "Users can view their workspace analytics"
  on usage_analytics for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = usage_analytics.workspace_id and status = 'active'
    )
  );

-- Custom Columns RLS
create policy "Users can view custom columns of their workspace"
  on custom_columns for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = custom_columns.workspace_id and status = 'active'
    )
  );

create policy "Members can manage custom columns"
  on custom_columns for all
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = custom_columns.workspace_id and status = 'active'
    )
  );

-- Integration Connections RLS
create policy "Users can view integrations of their workspace"
  on integration_connections for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = integration_connections.workspace_id and status = 'active'
    )
  );

create policy "Users can manage their own integrations"
  on integration_connections for all
  using (auth.uid() = user_id);

-- DMU Sketches RLS
create policy "Users can view DMU sketches of their workspace"
  on dmu_sketches for select
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = dmu_sketches.workspace_id and status = 'active'
    )
  );

create policy "Members can create and manage sketches"
  on dmu_sketches for all
  using (
    auth.uid() in (
      select user_id from team_members where workspace_id = dmu_sketches.workspace_id and status = 'active'
    )
  );

-- End of migration
