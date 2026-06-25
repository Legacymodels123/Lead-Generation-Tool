import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workspace";
}

export async function resolveWorkspaceIdForUser(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: membership } = await admin
    .from("team_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    return membership.workspace_id as string;
  }

  const { data: owned } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned?.id) {
    return owned.id as string;
  }

  return DEFAULT_WORKSPACE_ID;
}

export async function provisionUserWorkspace(
  admin: SupabaseClient,
  userId: string,
  email: string,
  name: string,
  company: string
): Promise<string> {
  const workspaceId = crypto.randomUUID();
  const slug = `${slugify(company)}-${workspaceId.slice(0, 8)}`;

  const { error: workspaceError } = await admin.from("workspaces").insert({
    id: workspaceId,
    slug,
    name: company,
    owner_user_id: userId,
    icp_config_id: "legacy-scale-models",
    config: { apiKeys: {}, columns: [], leadStatuses: ["qualified", "not_qualified"] },
  });

  if (workspaceError) {
    throw new Error(`Workspace aanmaken mislukt: ${workspaceError.message}`);
  }

  const { error: memberError } = await admin.from("team_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "admin",
    status: "active",
    email: email.toLowerCase(),
    name,
  });

  if (memberError) {
    throw new Error(`Team lid aanmaken mislukt: ${memberError.message}`);
  }

  await admin.from("profiles").upsert({
    user_id: userId,
    email: email.toLowerCase(),
    full_name: name,
    updated_at: new Date().toISOString(),
  });

  await admin.from("user_settings").upsert({
    user_id: userId,
    settings: {},
    updated_at: new Date().toISOString(),
  });

  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      name,
      company,
      workspace_id: workspaceId,
    },
  });

  if (metaError) {
    throw new Error(`Profiel bijwerken mislukt: ${metaError.message}`);
  }

  return workspaceId;
}

export async function ensureLegacyDemoMembership(
  admin: SupabaseClient,
  userId: string,
  email: string,
  name: string
): Promise<string> {
  const workspaceId = DEFAULT_WORKSPACE_ID;

  await admin.from("workspaces").upsert(
    {
      id: workspaceId,
      slug: workspaceId,
      name: "Legacy Scale Models",
      icp_config_id: workspaceId,
      owner_user_id: userId,
    },
    { onConflict: "id" }
  );

  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("team_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "admin",
      status: "active",
      email: email.toLowerCase(),
      name,
    });
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      name,
      company: "Legacy Scale Models",
      workspace_id: workspaceId,
    },
  });

  return workspaceId;
}
