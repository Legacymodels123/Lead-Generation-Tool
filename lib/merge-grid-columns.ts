import { GRID_COLUMNS, type GridColumnDef } from "@/lib/grid-columns";
import type { CustomColumn, ColumnAutomationKind } from "@/lib/types";

export function customColumnGridId(column: CustomColumn): string {
  return `custom:${column.key}`;
}

function automationToGridAction(column: CustomColumn): GridColumnDef["automatable"] {
  const kind = column.automation?.kind;
  if (!kind) return undefined;
  if (kind === "ai") return `custom:${column.key}`;
  if (kind === "research") return `research:${column.key}`;
  return kind as GridColumnDef["automatable"];
}

export function customColumnToGridDef(column: CustomColumn): GridColumnDef {
  const isAi = column.type === "ai_enriched" || column.automation?.kind === "ai";
  return {
    id: customColumnGridId(column),
    label: column.label,
    sortable: false,
    defaultVisible: column.visible,
    automatable: automationToGridAction(column),
    className: isAi ? "ai-col" : undefined,
    isCustom: true,
    customColumnId: column.id,
    columnType: column.type,
    selectOptions: column.selectOptions,
  };
}

export function mergeGridColumns(customColumns: CustomColumn[]): GridColumnDef[] {
  const builtins = [...GRID_COLUMNS];
  const customs = customColumns
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(customColumnToGridDef);
  return [...builtins, ...customs];
}

export function allColumnOrder(customColumns: CustomColumn[]): string[] {
  return mergeGridColumns(customColumns).map((c) => c.id);
}

export function findCustomColumn(
  customColumns: CustomColumn[],
  gridColId: string
): CustomColumn | undefined {
  if (!gridColId.startsWith("custom:")) return undefined;
  const key = gridColId.slice(7);
  return customColumns.find((c) => c.key === key);
}

export function actionForCustomColumn(column: CustomColumn): string | null {
  const kind = column.automation?.kind as ColumnAutomationKind | undefined;
  if (!kind) return null;
  if (kind === "ai") return `custom:${column.key}`;
  if (kind === "research") return `research:${column.key}`;
  return kind;
}
