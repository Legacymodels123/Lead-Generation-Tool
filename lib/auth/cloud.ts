import { getSupabaseServerKey } from "@/lib/supabase/env";

/** Supabase Auth + admin provisioning available. */
export function isAuthCloudEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      getSupabaseServerKey()
  );
}

/**
 * In-memory demo sessions (stable token, integrations, leads cache).
 * Enabled by default; set DISABLE_MEMORY_AUTH=1 to turn off.
 */
export function isMemoryAuthEnabled(): boolean {
  return process.env.DISABLE_MEMORY_AUTH !== "1";
}

/** @deprecated use isMemoryAuthEnabled */
export function isDevMemoryAuthEnabled(): boolean {
  return isMemoryAuthEnabled();
}
