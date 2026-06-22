import {
  getWorkspaceConfig,
  maskWorkspaceConfig,
  mergeWorkspaceConfig,
} from "@/lib/server/workspace-config-store";
import { mergeApiKeysPatch } from "@/lib/integrations/status";
import type { WorkspaceConfig } from "@/lib/types";

function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Ensure workspace row exists so config updates do not silently no-op */
export async function ensureWorkspaceRow(workspaceId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("workspaces").upsert(
    {
      id: workspaceId,
      slug: workspaceId,
      name: workspaceId.replace(/-/g, " "),
      icp_config_id: "legacy-scale-models",
    },
    { onConflict: "id" }
  );
  if (error) {
    throw new Error(`Workspace aanmaken mislukt: ${error.message}`);
  }
}

export async function getWorkspaceConfigForApi(
  workspaceId: string,
  mask = false
): Promise<WorkspaceConfig> {
  if (!hasSupabase()) {
    const config = getWorkspaceConfig(workspaceId);
    return mask ? maskWorkspaceConfig(config) : config;
  }

  const supabase = await getSupabaseAdmin();

  const { data, error } = await supabase
    .from("workspaces")
    .select("config")
    .eq("id", workspaceId)
    .single();

  if (error || !data) {
    const config = getWorkspaceConfig(workspaceId);
    return mask ? maskWorkspaceConfig(config) : config;
  }

  const config = (data.config || {}) as WorkspaceConfig;
  mergeWorkspaceConfig(workspaceId, config);
  return mask ? maskWorkspaceConfig(config) : config;
}

export type ConfigSaveResult = {
  config: WorkspaceConfig;
  storage: "supabase" | "memory";
};

export async function saveWorkspaceConfigForApi(
  workspaceId: string,
  patch: Partial<WorkspaceConfig>
): Promise<ConfigSaveResult> {
  const current = await getWorkspaceConfigForApi(workspaceId);
  const merged: WorkspaceConfig = {
    ...current,
    ...patch,
    apiKeys: patch.apiKeys
      ? mergeApiKeysPatch(current.apiKeys, patch.apiKeys)
      : current.apiKeys,
    mcpServers: patch.mcpServers ?? current.mcpServers,
    oauth: patch.oauth
      ? { ...(current.oauth as object), ...(patch.oauth as object) }
      : current.oauth,
  };

  if (!hasSupabase()) {
    const saved = mergeWorkspaceConfig(workspaceId, merged);
    return { config: saved, storage: "memory" };
  }

  await ensureWorkspaceRow(workspaceId);
  const supabase = await getSupabaseAdmin();

  const { error } = await supabase
    .from("workspaces")
    .update({ config: merged })
    .eq("id", workspaceId);

  if (error) {
    console.error("Supabase config save failed:", error);
    throw new Error(
      `Opslaan mislukt (${error.message}). Controleer of de workspaces-tabel bestaat in Supabase.`
    );
  }

  mergeWorkspaceConfig(workspaceId, merged);
  return { config: merged, storage: "supabase" };
}
