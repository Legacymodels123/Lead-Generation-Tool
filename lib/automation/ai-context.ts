import { AsyncLocalStorage } from "node:async_hooks";

type AiContext = { workspaceId: string };

const aiContextStorage = new AsyncLocalStorage<AiContext>();

export function runWithWorkspaceAi<T>(workspaceId: string, fn: () => T): T {
  return aiContextStorage.run({ workspaceId }, fn);
}

export function getWorkspaceAiId(): string | undefined {
  return aiContextStorage.getStore()?.workspaceId;
}
