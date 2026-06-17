import { createClient } from "@supabase/supabase-js";
import type { CustomColumn, CustomColumnType } from "@/lib/types";

export async function fetchCustomColumns(workspaceId: string): Promise<CustomColumn[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error } = await supabase
    .from("custom_columns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching custom columns:", error);
    return [];
  }

  return (data || []) as CustomColumn[];
}

export async function createCustomColumn(
  workspaceId: string,
  column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt">
): Promise<CustomColumn | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error } = await supabase
    .from("custom_columns")
    .insert([
      {
        ...column,
        workspace_id: workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating custom column:", error);
    return null;
  }

  return data as CustomColumn;
}

export async function updateCustomColumn(
  columnId: string,
  updates: Partial<CustomColumn>
): Promise<CustomColumn | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error } = await supabase
    .from("custom_columns")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", columnId)
    .select()
    .single();

  if (error) {
    console.error("Error updating custom column:", error);
    return null;
  }

  return data as CustomColumn;
}

export async function deleteCustomColumn(columnId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { error } = await supabase.from("custom_columns").delete().eq("id", columnId);

  if (error) {
    console.error("Error deleting custom column:", error);
    return false;
  }

  return true;
}

export async function reorderCustomColumns(
  workspaceId: string,
  columnIds: string[]
): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  // Update order for each column
  const updates = columnIds.map((id, index) => ({
    id,
    order: index,
    workspace_id: workspaceId,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from("custom_columns")
      .update({ order: update.order, updated_at: update.updated_at })
      .eq("id", update.id);

    if (error) {
      console.error("Error reordering columns:", error);
      return false;
    }
  }

  return true;
}
