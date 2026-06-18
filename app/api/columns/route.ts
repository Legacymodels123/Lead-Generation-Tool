import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { fetchCustomColumns, createCustomColumn, reorderCustomColumns } from "@/lib/db/custom-columns";
import { validateCustomColumnKey, sanitizeColumnLabel, isValidCustomColumnType } from "@/lib/utils/custom-columns";
import { DEFAULT_COLUMNS } from "@/lib/types";
import type { ColumnAutomation } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuth(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? auth?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const customColumns = await fetchCustomColumns(workspaceId);
    const allColumns = [...DEFAULT_COLUMNS, ...customColumns];

    return NextResponse.json({
      default: DEFAULT_COLUMNS,
      custom: customColumns,
      all: allColumns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  } catch (error) {
    console.error("Error fetching columns:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      workspaceId = auth.workspaceId,
      label,
      type,
      defaultValue,
      selectOptions,
      visible,
      automation,
      aiPrompt,
    } = await request.json();

    if (!workspaceId || !label || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidCustomColumnType(type) && type !== "ai_enriched") {
      return NextResponse.json({ error: "Invalid column type" }, { status: 400 });
    }

    const key = sanitizeColumnLabel(label)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 50);

    if (!validateCustomColumnKey(key)) {
      return NextResponse.json({ error: "Invalid column key" }, { status: 400 });
    }

    const customColumns = await fetchCustomColumns(workspaceId);
    const nextOrder = Math.max(0, ...customColumns.map((c) => c.order || 0)) + 1;

    const resolvedAutomation: ColumnAutomation | undefined =
      automation ??
      (aiPrompt ? { kind: "ai", prompt: aiPrompt } : undefined) ??
      (type === "ai_enriched" ? { kind: "ai", prompt: "Summarize this company for sales outreach." } : undefined);

    const newColumn = await createCustomColumn(workspaceId, {
      key,
      label: sanitizeColumnLabel(label),
      type: type === "ai_enriched" ? "text" : type,
      order: nextOrder,
      visible: visible !== false,
      defaultValue,
      selectOptions: type === "select" ? (Array.isArray(selectOptions) ? selectOptions : []) : undefined,
      automation: resolvedAutomation,
      aiPrompt: resolvedAutomation?.prompt,
    });

    if (!newColumn) {
      return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
    }

    return NextResponse.json(newColumn, { status: 201 });
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId = auth.workspaceId, columnIds } = await request.json();

    if (!workspaceId || !Array.isArray(columnIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const success = await reorderCustomColumns(workspaceId, columnIds);

    if (!success) {
      return NextResponse.json({ error: "Failed to reorder columns" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering columns:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
