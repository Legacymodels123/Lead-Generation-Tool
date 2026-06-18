-- Add automation config to custom columns for AI/enrich/research actions
alter table custom_columns add column if not exists automation jsonb;

-- Ensure custom_column_values exists on leads
alter table leads add column if not exists custom_column_values jsonb default '{}';
