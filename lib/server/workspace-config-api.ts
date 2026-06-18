import {
  getWorkspaceConfig,
  maskWorkspaceConfig,
  mergeWorkspaceConfig,
} from "@/lib/server/workspace-config-store";
import type { WorkspaceConfig } from "@/lib/types";

function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getWorkspaceConfigForApi(
  workspaceId: string,
  mask = false
): Promise<WorkspaceConfig> {
  if (!hasSupabase()) {
    const config = getWorkspaceConfig(workspaceId);
    return mask ? maskWorkspaceConfig(config) : config;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
  return mask ? maskWorkspaceConfig(config) : config;
}

export async function saveWorkspaceConfigForApi(
  workspaceId: string,
  patch: Partial<WorkspaceConfig>
): Promise<WorkspaceConfig> {
  if (!hasSupabase()) {
    return mergeWorkspaceConfig(workspaceId, patch);
  }

  const current = await getWorkspaceConfigForApi(workspaceId);
  const merged: WorkspaceConfig = {
    ...current,
    ...patch,
    apiKeys: {
      ...(current.apiKeys ?? {}),
      ...(patch.apiKeys ?? {}),
    },
    mcpServers: patch.mcpServers ?? current.mcpServers,
  };

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("workspaces")
    .update({ config: merged })
    .eq("id", workspaceId);

  if (error) {
    return mergeWorkspaceConfig(workspaceId, patch);
  }

  mergeWorkspaceConfig(workspaceId, merged);
  return merged;
}
