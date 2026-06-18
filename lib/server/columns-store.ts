import type { CustomColumn } from "@/lib/types";

const columnsByWorkspace = new Map<string, CustomColumn[]>();

export function getCustomColumns(workspaceId: string): CustomColumn[] {
  return [...(columnsByWorkspace.get(workspaceId) ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
}

export function createCustomColumnInStore(
  workspaceId: string,
  column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt" | "workspaceId">
): CustomColumn {
  const now = new Date().toISOString();
  const created: CustomColumn = {
    ...column,
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId,
    createdAt: now,
    updatedAt: now,
  };
  const list = columnsByWorkspace.get(workspaceId) ?? [];
  columnsByWorkspace.set(workspaceId, [...list, created]);
  return created;
}

export function updateCustomColumnInStore(
  columnId: string,
  updates: Partial<CustomColumn>
): CustomColumn | null {
  for (const [workspaceId, list] of columnsByWorkspace.entries()) {
    const idx = list.findIndex((c) => c.id === columnId);
    if (idx < 0) continue;
    const updated = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const next = [...list];
    next[idx] = updated;
    columnsByWorkspace.set(workspaceId, next);
    return updated;
  }
  return null;
}

export function deleteCustomColumnInStore(columnId: string): boolean {
  for (const [workspaceId, list] of columnsByWorkspace.entries()) {
    const next = list.filter((c) => c.id !== columnId);
    if (next.length !== list.length) {
      columnsByWorkspace.set(workspaceId, next);
      return true;
    }
  }
  return false;
}

export function reorderCustomColumnsInStore(
  workspaceId: string,
  columnIds: string[]
): boolean {
  const list = columnsByWorkspace.get(workspaceId) ?? [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const reordered = columnIds
    .map((id, order) => {
      const col = byId.get(id);
      return col ? { ...col, order, updatedAt: new Date().toISOString() } : null;
    })
    .filter((c): c is CustomColumn => Boolean(c));
  if (reordered.length !== list.length) return false;
  columnsByWorkspace.set(workspaceId, reordered);
  return true;
}
