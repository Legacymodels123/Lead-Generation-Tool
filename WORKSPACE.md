# B2B Lead Workspace (AG Grid)

Professional lead workspace at `/workspace` built with **AG Grid**, **Next.js**, and **Supabase**.

## Features

- Editable AG Grid with sort, filter, resize, and column reorder
- Dropdown editors for segment, confidence, lead_fit, and status
- Bulk row selection, add row, delete selected
- Copy/paste via AG Grid cell selection
- Auto-save edits to Supabase (`PATCH /api/workspace/leads`)
- CSV import/export
- Required-field highlighting and per-row validation errors
- Per-row **Enrich Lead** button (mock API, ready for real AI)

## Database setup

Run the migration in Supabase SQL Editor:

```
supabase/migrations/20240619_ag_grid_workspace.sql
```

Tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `workspace_leads` | Lead records (AG Grid data) |
| `evidence_sources` | Citations linked to leads |
| `workspace_enrichment_jobs` | Enrichment job log |
| `workspace_audit_log` | Change audit trail |

> Uses `workspace_leads` to avoid conflicting with the legacy `leads` table.

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/workspace/leads` | GET | List leads |
| `/api/workspace/leads` | POST | Create lead or bulk delete |
| `/api/workspace/leads` | PATCH | Update lead |
| `/api/workspace/leads/import` | POST | CSV import |
| `/api/workspace/leads/export` | GET | CSV export |
| `/api/workspace/enrich/[id]` | POST | Mock enrichment |
| `/api/workspace/enrichment-jobs` | GET | List jobs |

## File structure

```
app/workspace/           # Pages: Leads, Imports, Enrichment, Settings
app/api/workspace/       # CRUD, import/export, enrich
components/workspace/    # WorkspaceShell, LeadsAgGrid
lib/workspace/           # types, db, validation, csv, fetch
supabase/migrations/     # Schema SQL
```

## Connecting real AI enrichment

Edit `app/api/workspace/enrich/[id]/route.ts`:

1. Replace `mockEnrichment()` with your provider (OpenAI, Claude, etc.)
2. Insert rows into `evidence_sources` for each citation
3. Set `provider` on `workspace_enrichment_jobs` accordingly

## Local development

```bash
npm run dev
```

Open [http://localhost:3000/workspace](http://localhost:3000/workspace) after logging in.

Without Supabase env vars, the API falls back to in-memory storage for development.
