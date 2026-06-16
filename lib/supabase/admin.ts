import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerKey } from "./env";

export { getSupabaseServerKey } from "./env";

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServerKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
