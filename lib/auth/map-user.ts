import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import { STARTING_CREDITS } from "@/lib/types";
import { resolveWorkspaceIdForUser } from "@/lib/auth/provision";

export async function mapSupabaseUserToAppUser(
  admin: SupabaseClient,
  supabaseUser: SupabaseAuthUser
): Promise<User> {
  const metadata = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;
  const workspaceId = await resolveWorkspaceIdForUser(admin, supabaseUser.id, metadata);

  return {
    id: supabaseUser.id,
    email: supabaseUser.email?.toLowerCase() ?? "",
    name: typeof metadata.name === "string" ? metadata.name : "",
    company: typeof metadata.company === "string" ? metadata.company : "",
    credits: STARTING_CREDITS,
    workspaceId,
    transactions: [],
    integrations: {
      linkedin: false,
      crm: false,
      webhooks: false,
      nightlyAgent: false,
    },
  };
}
