# Lead Generation Tool

GTM workspace for Legacy Scale Models — LinkedIn Sales Navigator import, AI enrichment (Claude/OpenAI), DMU contacts, and HubSpot CRM sync.

## Quick start

```powershell
cd "Lead Generation Tool"
npm install
npm run dev
```

Demo login: `levi@legacy.com` / `legacy123`

## Features

- **LinkedIn Sales Navigator CSV import** — group by company, auto-create 2 DMU contacts (Marketing/Brand + CEO/Owner)
- **AI enrichment** — market, fit reason, contact email/phone (with confidence flags)
- **Editable grid** — account rows with expandable DMU contact rows
- **HubSpot sync** — push Company + Contacts via `HUBSPOT_ACCESS_TOKEN`
- **Nightly cron** — `/api/jobs/nightly` at 02:00 UTC (Vercel Cron)
- **Multi-tenant ready** — workspace + ICP config (`/api/workspaces`)

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI enrichment |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot Private App token |
| `CRON_SECRET` | Secure nightly job endpoint |

Run `supabase/schema.sql` in Supabase SQL Editor for fresh projects.

## Workflow

1. Export leads from LinkedIn Sales Navigator (CSV)
2. Import in app → **Verrijk geselecteerde** for market/fit/DMU details
3. Review and edit in grid
4. **↑ HubSpot** to push qualified accounts
