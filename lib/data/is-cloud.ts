import { getSupabaseServerKey } from "@/lib/supabase/env";

/** Supabase data layer (leads, config) — requires service role key. */
export function isCloudDataEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getSupabaseServerKey()
  );
}

/** @deprecated use isCloudDataEnabled */
export function isCloudEnabled(): boolean {
  return isCloudDataEnabled();
}
