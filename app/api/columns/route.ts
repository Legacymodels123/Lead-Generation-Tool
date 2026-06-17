import { fetchCustomColumns, createCustomColumn, reorderCustomColumns } from "@/lib/db/custom-columns";
import { validateCustomColumnKey, sanitizeColumnLabel, isValidCustomColumnType } from "@/lib/utils/custom-columns";
import { DEFAULT_COLUMNS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return Response.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const customColumns = await fetchCustomColumns(workspaceId);
    const allColumns = [...DEFAULT_COLUMNS, ...customColumns];

    return Response.json({
      default: DEFAULT_COLUMNS,
      custom: customColumns,
      all: allColumns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  } catch (error) {
    console.error("Error fetching columns:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, label, type, defaultValue, selectOptions, visible } = await request.json();

    if (!workspaceId || !label || !type) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidCustomColumnType(type)) {
      return Response.json({ error: "Invalid column type" }, { status: 400 });
    }

    const key = sanitizeColumnLabel(label)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 50);

    if (!validateCustomColumnKey(key)) {
      return Response.json({ error: "Invalid column key" }, { status: 400 });
    }

    const customColumns = await fetchCustomColumns(workspaceId);
    const nextOrder = Math.max(0, ...customColumns.map((c) => c.order || 0)) + 1;

    const newColumn = await createCustomColumn(workspaceId, {
      key,
      label: sanitizeColumnLabel(label),
      type,
      order: nextOrder,
      visible: visible !== false,
      defaultValue,
      selectOptions: type === "select" ? (Array.isArray(selectOptions) ? selectOptions : []) : undefined,
    });

    if (!newColumn) {
      return Response.json({ error: "Failed to create column" }, { status: 500 });
    }

    return Response.json(newColumn, { status: 201 });
  } catch (error) {
    console.error("Error creating column:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { workspaceId, columnIds } = await request.json();

    if (!workspaceId || !Array.isArray(columnIds)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const success = await reorderCustomColumns(workspaceId, columnIds);

    if (!success) {
      return Response.json({ error: "Failed to reorder columns" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error reordering columns:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
