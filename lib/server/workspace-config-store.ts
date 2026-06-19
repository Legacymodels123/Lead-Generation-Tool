import type { McpConnection, WorkspaceConfig } from "@/lib/types";

const configs = new Map<string, WorkspaceConfig>();

export function getWorkspaceConfig(workspaceId: string): WorkspaceConfig {
  return configs.get(workspaceId) ?? {};
}

export function mergeWorkspaceConfig(
  workspaceId: string,
  patch: Partial<WorkspaceConfig>
): WorkspaceConfig {
  const current = getWorkspaceConfig(workspaceId);
  const merged: WorkspaceConfig = {
    ...current,
    ...patch,
    apiKeys: {
      ...(current.apiKeys ?? {}),
      ...(patch.apiKeys ?? {}),
    },
    mcpServers: patch.mcpServers ?? current.mcpServers,
  };
  configs.set(workspaceId, merged);
  return merged;
}

export function maskWorkspaceConfig(config: WorkspaceConfig): WorkspaceConfig {
  const masked = { ...config };
  if (masked.apiKeys) {
    const keys = { ...masked.apiKeys };
    for (const k of Object.keys(keys) as (keyof typeof keys)[]) {
      const v = keys[k];
      if (typeof v === "string" && v.length > 4) {
        keys[k] = `${"•".repeat(Math.min(12, v.length - 4))}${v.slice(-4)}`;
      }
    }
    masked.apiKeys = keys;
  }
  if (masked.mcpServers) {
    masked.mcpServers = masked.mcpServers.map((s) => ({
      ...s,
      headers: s.headers ? { "***": "redacted" } : undefined,
    }));
  }
  return masked;
}

export function upsertMcpServer(
  workspaceId: string,
  server: McpConnection
): WorkspaceConfig {
  const current = getWorkspaceConfig(workspaceId);
  const list = [...(current.mcpServers ?? [])];
  const idx = list.findIndex((s) => s.id === server.id);
  if (idx >= 0) list[idx] = server;
  else list.push(server);
  return mergeWorkspaceConfig(workspaceId, { mcpServers: list });
}

export function removeMcpServer(workspaceId: string, id: string): WorkspaceConfig {
  const current = getWorkspaceConfig(workspaceId);
  return mergeWorkspaceConfig(workspaceId, {
    mcpServers: (current.mcpServers ?? []).filter((s) => s.id !== id),
  });
}
