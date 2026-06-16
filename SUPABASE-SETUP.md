# Supabase setup — project `cslqtqxghgsocejvvvdb`

Your Supabase project exists, but the **database schema did not match the app**. The old tables used **UUID** columns for `id` and `user_id`, while the app uses **text** IDs like `demo-user`. Inserts failed silently and the app fell back to local browser storage.

## Step 1 — Reset database schema (5 min)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/cslqtqxghgsocejvvvdb/sql/new)
2. Copy the entire contents of [`supabase/reset-and-setup.sql`](supabase/reset-and-setup.sql)
3. Click **Run**
4. Confirm in **Table Editor** you see: `leads`, `contacts`, `batches`, `workspaces`

## Step 2 — Copy API keys

1. Open [Project Settings → API](https://supabase.com/dashboard/project/cslqtqxghgsocejvvvdb/settings/api)
2. Copy into `.env.local` (local) **and** Vercel env vars (live):

| Variable | Where to copy |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (secret — never expose in browser) |

Replace `VOEKHIERINVANSUPABASEDASHBOARD` in `.env.local` with the real service_role key.

## Step 3 — Add env vars on Vercel

1. [Vercel → lead-generation-tool → Settings → Environment Variables](https://vercel.com/levi-kempen-s-projects/lead-generation-tool/settings/environment-variables)
2. Add all three Supabase variables above for **Production**, **Preview**, and **Development**
3. **Redeploy** (Deployments → latest → Redeploy)

## Step 4 — Verify

1. Open https://lead-generation-tool-nine.vercel.app/api/health/status  
   → should show `"cloud": true`
2. Log in with `levi@legacy.com` / `legacy123`
3. Leads page badge should say **Cloud actief**
4. Edit a cell, refresh — change should persist

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Still shows **Lokaal (browser)** | Vercel env vars missing or not redeployed after adding them |
| `cloud: false` on health endpoint | Same as above — check all 3 Supabase vars on Vercel |
| Cloud badge but save fails | Run `reset-and-setup.sql` again; check Vercel function logs |
| `invalid input syntax for type uuid` | Old schema still in place — run `reset-and-setup.sql` |
