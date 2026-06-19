-- Add city column used by the Companies grid
alter table public.leads
  add column if not exists city text not null default '';
