-- Demo auth uses text user ids (e.g. demo-user-001), not Supabase auth.users UUIDs.
alter table public.integration_connections
  drop constraint if exists integration_connections_user_id_fk;

alter table public.integration_connections
  alter column user_id type text using user_id::text;
