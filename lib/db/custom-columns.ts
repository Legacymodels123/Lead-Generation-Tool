import type { CustomColumn, ColumnAutomation } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCloudDataEnabled } from "@/lib/data/is-cloud";
import {
  createCustomColumnMemory,
  deleteCustomColumnMemory,
  getCustomColumns,
  reorderCustomColumnsMemory,
  updateCustomColumnMemory,
} from "@/lib/server/custom-columns-store";

interface CustomColumnRow {
  id: string;
  workspace_id: string;
  key: string;
  label: string;
  type: string;
  visible: boolean;
  order: number;
  default_value: string | null;
  select_options: string[] | null;
  automation: ColumnAutomation | null;
  created_at: string;
  updated_at: string;
}

function rowToCustomColumn(row: CustomColumnRow): CustomColumn {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    key: row.key,
    label: row.label,
    type: row.type as CustomColumn["type"],
    visible: row.visible,
    order: row.order,
    defaultValue: row.default_value ?? undefined,
    selectOptions: row.select_options ?? undefined,
    automation: row.automation ?? undefined,
    aiPrompt: row.automation?.kind === "ai" ? row.automation.prompt : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function columnToRow(
  workspaceId: string,
  column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt" | "workspaceId">
): Omit<CustomColumnRow, "id" | "created_at" | "updated_at"> {
  const automation =
    column.automation ??
    (column.aiPrompt ? ({ kind: "ai" as const, prompt: column.aiPrompt } satisfies ColumnAutomation) : null);

  return {
    workspace_id: workspaceId,
    key: column.key,
    label: column.label,
    type: column.type,
    visible: column.visible,
    order: column.order,
    default_value: column.defaultValue != null ? String(column.defaultValue) : null,
    select_options: column.selectOptions ?? null,
    automation,
  };
}

export async function fetchCustomColumns(workspaceId: string): Promise<CustomColumn[]> {
  if (isCloudDataEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("custom_columns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order", { ascending: true });

      if (error) {
        console.warn(`custom_columns fetch (${workspaceId}):`, error.message);
        return [];
      }

      if (data?.length) {
        return (data as CustomColumnRow[]).map(rowToCustomColumn);
      }

      return [];
    }
  }

  return getCustomColumns(workspaceId);
}

export async function createCustomColumn(
  workspaceId: string,
  column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt" | "workspaceId">
): Promise<CustomColumn | null> {
  if (isCloudDataEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("custom_columns")
        .insert([{ ...columnToRow(workspaceId, column), created_at: now, updated_at: now }])
        .select()
        .single();

      if (error) {
        console.warn(`custom_columns create (${workspaceId}):`, error.message);
        return null;
      }

      if (data) return rowToCustomColumn(data as CustomColumnRow);
    }
  }

  return createCustomColumnMemory(workspaceId, column);
}

export async function updateCustomColumn(
  columnId: string,
  updates: Partial<CustomColumn>
): Promise<CustomColumn | null> {
  if (isCloudDataEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.label != null) patch.label = updates.label;
      if (updates.type != null) patch.type = updates.type;
      if (updates.visible != null) patch.visible = updates.visible;
      if (updates.order != null) patch.order = updates.order;
      if (updates.defaultValue != null) patch.default_value = String(updates.defaultValue);
      if (updates.selectOptions != null) patch.select_options = updates.selectOptions;
      if (updates.automation != null) patch.automation = updates.automation;
      if (updates.aiPrompt != null) {
        patch.automation = { kind: "ai", prompt: updates.aiPrompt };
      }

      const { data, error } = await supabase
        .from("custom_columns")
        .update(patch)
        .eq("id", columnId)
        .select()
        .single();

      if (error) {
        console.warn(`custom_columns update (${columnId}):`, error.message);
        return null;
      }

      if (data) return rowToCustomColumn(data as CustomColumnRow);
    }
  }

  return updateCustomColumnMemory(columnId, updates);
}

export async function deleteCustomColumn(columnId: string): Promise<boolean> {
  if (isCloudDataEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { error } = await supabase.from("custom_columns").delete().eq("id", columnId);
      if (error) {
        console.warn(`custom_columns delete (${columnId}):`, error.message);
        return false;
      }
      return true;
    }
  }

  return deleteCustomColumnMemory(columnId);
}

export async function reorderCustomColumns(
  workspaceId: string,
  columnIds: string[]
): Promise<boolean> {
  if (isCloudDataEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      for (let index = 0; index < columnIds.length; index++) {
        const { error } = await supabase
          .from("custom_columns")
          .update({ order: index, updated_at: new Date().toISOString() })
          .eq("id", columnIds[index]);
        if (error) {
          console.warn(`custom_columns reorder (${columnIds[index]}):`, error.message);
          return false;
        }
      }
      return true;
    }
  }

  return reorderCustomColumnsMemory(workspaceId, columnIds);
}
