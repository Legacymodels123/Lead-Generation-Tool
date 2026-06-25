# Greenfield Launch Guide

## Objective

Launch a new live product as a dynamic company enrichment workspace with:
- spreadsheet-first UI
- dynamic property creation
- Claude-first AI enrichment
- Hunter and Lusha enrichment
- two-way HubSpot sync

## Current blockers

These two items must be resolved before the true remote launch can happen:
- GitHub CLI is not authenticated on this machine
- Vercel CLI is not installed on this machine

## Recommended project identity

- GitHub repo: `company-enrichment-workspace`
- Vercel project: `company-enrichment-workspace`
- Supabase project: `company-enrichment-workspace`

## Platform stack

- Next.js App Router
- TypeScript
- Supabase Auth + Postgres
- Vercel deploys + previews
- Claude as primary AI provider
- Hunter + Lusha as enrichment providers
- HubSpot as two-way CRM sync target

## Launch sequence

### 1. Repository
- Create a new GitHub repository
- Push the greenfield codebase into that repository
- Enable preview deploys via Vercel Git integration

### 2. Supabase
- Create a new Supabase project
- Apply the schema contract in `supabase/greenfield-schema.sql`
- Add required auth and RLS policies before exposing the app

### 3. Vercel
- Create a new Vercel project linked to the new GitHub repo
- Add all required environment variables from `.env.example`
- Run preview deploys first
- Promote to production after the first full slice is verified

## Minimum verification before production

- login works
- workspace loads
- import creates dynamic properties
- row edits save
- Claude enrichment fills AI properties
- HubSpot connection succeeds
- property sync works in both directions

## What has already been prepared locally

- new workspace-first route structure
- setup route
- settings route
- launch-ready environment template
- greenfield schema contract
- UI baseline notes
