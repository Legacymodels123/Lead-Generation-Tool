import { getSupabaseServerKey } from "@/lib/supabase/env";

/** Supabase Auth + admin provisioning available (production path). */
export function isAuthCloudEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      getSupabaseServerKey()
  );
}

/** In-memory demo auth only when cloud auth is not configured. */
export function isDevMemoryAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && !isAuthCloudEnabled();
}
