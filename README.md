# Company Enrichment Workspace

Greenfield product direction for a dynamic, spreadsheet-first company enrichment workspace with:
- dynamic properties created from imports
- Claude-first AI property enrichment
- Hunter and Lusha provider enrichment
- two-way HubSpot sync
- Airtable/HubSpot/Excel-inspired operator UX

## Current state

The app is being reshaped into a new greenfield product while still living in the existing local workspace.

Two external setup blockers remain before a true live launch:
- `gh auth status` shows GitHub CLI is not logged in
- `vercel` CLI is not installed on this machine

Because of that, the codebase now contains the product foundation and launch artifacts, but the final remote repo and live Vercel project still need to be created once those two access issues are resolved.

## Product routes

- `/workspace` — main enrichment board
- `/setup` — Claude, Hunter, Lusha, HubSpot connections
- `/settings` — minimal runtime settings

Legacy routes now redirect into the new flow where appropriate.

## Local quick start

```powershell
cd "C:\Users\LeviKempen\OneDrive - Holland Oto\Lead Generation Tool"
npm install
npm run dev
```

## Launch checklist

1. Create a new GitHub repo: `company-enrichment-workspace`
2. Create a new Supabase project with a clean schema
3. Create a new Vercel project linked to that repo
4. Copy `.env.example` to `.env.local`
5. Add the same environment variables in Vercel
6. Apply the greenfield schema contract before building deeper features

Supporting docs:
- `docs/greenfield-launch.md`
- `docs/ui-baseline.md`
- `supabase/greenfield-schema.sql`

## Main environment groups

- Supabase auth/database
- Claude AI
- Hunter enrichment
- Lusha enrichment
- HubSpot OAuth and sync

See `.env.example` for the full launch template.
