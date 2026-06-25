# Company Enrichment Workspace

Greenfield scaffold for a dynamic property enrichment workspace.

## Product direction

- spreadsheet-first operator board
- dynamic properties from imports
- Claude-first AI enrichment
- Hunter and Lusha enrichment
- two-way HubSpot sync

## Routes

- `/workspace`
- `/setup`
- `/settings`

## Start

```powershell
npm install
npm run dev
```

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:
- Supabase
- Claude
- Hunter
- Lusha
- HubSpot

## Notes

This scaffold was created inside the existing local workspace because:
- GitHub CLI is not authenticated on this machine
- Vercel CLI is not installed on this machine

Once those are fixed, this folder can be moved into the new GitHub repository and linked to a fresh Vercel project.
