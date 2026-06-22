"use client";

import type { CustomColumn } from "@/lib/types";

const STORAGE_KEY = "legacy-leadgen-custom-columns";

export function loadCustomColumnsLocal(workspaceId: string): CustomColumn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${workspaceId}`);
    return raw ? (JSON.parse(raw) as CustomColumn[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomColumnsLocal(workspaceId: string, columns: CustomColumn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}-${workspaceId}`, JSON.stringify(columns));
}

export async function fetchCustomColumnsClient(
  workspaceId: string,
  token: string | null
): Promise<CustomColumn[]> {
  if (!token) return loadCustomColumnsLocal(workspaceId);

  try {
    const res = await fetch(`/api/columns?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return loadCustomColumnsLocal(workspaceId);
    const data = (await res.json()) as { custom: CustomColumn[] };
    const cols = data.custom ?? [];
    saveCustomColumnsLocal(workspaceId, cols);
    return cols;
  } catch {
    return loadCustomColumnsLocal(workspaceId);
  }
}

export async function createCustomColumnClient(
  workspaceId: string,
  token: string | null,
  payload: {
    label: string;
    type: CustomColumn["type"];
    defaultValue?: string;
    selectOptions?: string[];
    aiPrompt?: string;
    condition?: CustomColumn["condition"];
  }
): Promise<CustomColumn | null> {
  if (!token) {
    const local = loadCustomColumnsLocal(workspaceId);
    const key = payload.label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 50);
    const now = new Date().toISOString();
    const created: CustomColumn = {
      id: `local-${Date.now()}`,
      workspaceId,
      key: key || "column",
      label: payload.label,
      type: payload.type,
      visible: true,
      order: local.length,
      defaultValue: payload.defaultValue,
      selectOptions: payload.selectOptions,
      aiPrompt: payload.aiPrompt,
      condition: payload.condition,
      createdAt: now,
      updatedAt: now,
    };
    saveCustomColumnsLocal(workspaceId, [...local, created]);
    return created;
  }

  const res = await fetch("/api/columns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    console.error("Create column failed:", err.error ?? res.status);
    return null;
  }
  const created = (await res.json()) as CustomColumn;
  const local = loadCustomColumnsLocal(workspaceId);
  saveCustomColumnsLocal(workspaceId, [...local.filter((c) => c.id !== created.id), created]);
  return created;
}

export async function updateCustomColumnClient(
  token: string | null,
  workspaceId: string,
  columnId: string,
  updates: Partial<CustomColumn>
): Promise<CustomColumn | null> {
  if (!token) {
    const local = loadCustomColumnsLocal(workspaceId);
    const idx = local.findIndex((c) => c.id === columnId);
    if (idx < 0) return null;
    const updated = { ...local[idx], ...updates, updatedAt: new Date().toISOString() };
    const next = [...local];
    next[idx] = updated;
    saveCustomColumnsLocal(workspaceId, next);
    return updated;
  }

  const res = await fetch(`/api/columns/${columnId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  return (await res.json()) as CustomColumn;
}
