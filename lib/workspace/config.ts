import type { WorkspaceConfig } from "@/lib/types";

const CONFIG_CACHE: Map<string, WorkspaceConfig> = new Map();

export async function fetchWorkspaceConfig(
  workspaceId: string
): Promise<WorkspaceConfig> {
  // Check cache first
  if (CONFIG_CACHE.has(workspaceId)) {
    return CONFIG_CACHE.get(workspaceId) || {};
  }

  try {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/config`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      console.warn(`Failed to fetch workspace config: ${response.statusText}`);
      return {};
    }
    const config = (await response.json()) as WorkspaceConfig;
    CONFIG_CACHE.set(workspaceId, config);
    return config;
  } catch (err) {
    console.error("Failed to fetch workspace config:", err);
    return {};
  }
}

export async function updateWorkspaceConfig(
  workspaceId: string,
  config: Partial<WorkspaceConfig>
): Promise<WorkspaceConfig> {
  try {
    const response = await fetch(`/api/workspaces/${workspaceId}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`);
    }

    const updated = (await response.json()) as WorkspaceConfig;
    CONFIG_CACHE.set(workspaceId, updated);
    return updated;
  } catch (err) {
    console.error("Failed to update workspace config:", err);
    throw err;
  }
}

export function clearConfigCache(workspaceId?: string): void {
  if (workspaceId) {
    CONFIG_CACHE.delete(workspaceId);
  } else {
    CONFIG_CACHE.clear();
  }
}

export async function getApiKey(
  workspaceId: string,
  provider: "openai" | "hubspot" | "lusha"
): Promise<string | undefined> {
  const config = await fetchWorkspaceConfig(workspaceId);
  let key = config.apiKeys?.[provider];

  // Fallback to env vars
  if (!key) {
    if (provider === "openai") key = process.env.OPENAI_API_KEY;
    if (provider === "hubspot") key = process.env.HUBSPOT_ACCESS_TOKEN;
  }

  return key;
}
