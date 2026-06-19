import type { IntegrationProvider } from "@/lib/types";

interface StoredConnection {
  workspaceId: string;
  userId: string;
  provider: IntegrationProvider;
  accessToken: string;
  status: "connected" | "error";
  updatedAt: string;
}

const store = new Map<string, StoredConnection>();

function key(workspaceId: string, userId: string, provider: IntegrationProvider): string {
  return `${workspaceId}:${userId}:${provider}`;
}

export function getConnectionMemory(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider
): StoredConnection | null {
  return store.get(key(workspaceId, userId, provider)) ?? null;
}

export function listConnectionsMemory(
  workspaceId: string,
  userId: string
): StoredConnection[] {
  return [...store.values()].filter(
    (c) => c.workspaceId === workspaceId && c.userId === userId
  );
}

export function saveConnectionMemory(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider,
  accessToken: string
): StoredConnection {
  const entry: StoredConnection = {
    workspaceId,
    userId,
    provider,
    accessToken,
    status: "connected",
    updatedAt: new Date().toISOString(),
  };
  store.set(key(workspaceId, userId, provider), entry);
  return entry;
}

export function deleteConnectionMemory(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider
): void {
  store.delete(key(workspaceId, userId, provider));
}
