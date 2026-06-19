import type { CustomColumn } from "@/lib/types";
import { generateId } from "@/lib/utils";

const store = new Map<string, CustomColumn[]>();

function workspaceKey(workspaceId: string): string {
  return workspaceId;
}

export function getCustomColumns(workspaceId: string): CustomColumn[] {
  return [...(store.get(workspaceKey(workspaceId)) ?? [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
}

export function createCustomColumnMemory(
  workspaceId: string,
  column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt" | "workspaceId">
): CustomColumn {
  const key = workspaceKey(workspaceId);
  const list = store.get(key) ?? [];
  const now = new Date().toISOString();
  const created: CustomColumn = {
    ...column,
    id: generateId(),
    workspaceId,
    createdAt: now,
    updatedAt: now,
  };
  list.push(created);
  store.set(key, list);
  return created;
}

export function updateCustomColumnMemory(
  columnId: string,
  updates: Partial<CustomColumn>
): CustomColumn | null {
  for (const [ws, list] of store.entries()) {
    const idx = list.findIndex((c) => c.id === columnId);
    if (idx >= 0) {
      const updated = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = updated;
      store.set(ws, list);
      return updated;
    }
  }
  return null;
}

export function deleteCustomColumnMemory(columnId: string): boolean {
  for (const [ws, list] of store.entries()) {
    const next = list.filter((c) => c.id !== columnId);
    if (next.length !== list.length) {
      store.set(ws, next);
      return true;
    }
  }
  return false;
}

export function reorderCustomColumnsMemory(
  workspaceId: string,
  columnIds: string[]
): boolean {
  const list = store.get(workspaceKey(workspaceId)) ?? [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const reordered: CustomColumn[] = [];
  columnIds.forEach((id, index) => {
    const col = byId.get(id);
    if (col) {
      reordered.push({ ...col, order: index, updatedAt: new Date().toISOString() });
    }
  });
  const remaining = list.filter((c) => !columnIds.includes(c.id));
  store.set(workspaceKey(workspaceId), [...reordered, ...remaining]);
  return true;
}
