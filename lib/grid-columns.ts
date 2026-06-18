import type { CustomColumn } from "@/lib/types";
import type { SortField } from "./views";

export interface GridColumnDef {
  id: string;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  automatable?: "score" | "enrich" | "aiMessage" | "aiSummary" | "aiNextStep" | "research" | "hubspot" | string;
  className?: string;
  isCustom?: boolean;
  customColumnId?: string;
  columnType?: CustomColumn["type"];
  selectOptions?: string[];
}

export const GRID_COLUMNS: GridColumnDef[] = [
  { id: "company", label: "Bedrijf", sortable: true, defaultVisible: true },
  { id: "market", label: "Markt", sortable: true, defaultVisible: true },
  { id: "fitReason", label: "Waarom fit", sortable: false, defaultVisible: true },
  { id: "dmu", label: "DMU / Contact", sortable: false, defaultVisible: true },
  { id: "email", label: "E-mail", sortable: false, defaultVisible: true, automatable: "enrich" },
  { id: "phone", label: "Telefoon", sortable: false, defaultVisible: true },
  { id: "score", label: "Fit score", sortable: true, defaultVisible: true, automatable: "score" },
  { id: "status", label: "Status", sortable: true, defaultVisible: true },
  { id: "batch", label: "Batch", sortable: true, defaultVisible: false },
  {
    id: "aiSummary",
    label: "AI Samenvatting",
    sortable: false,
    defaultVisible: true,
    automatable: "aiSummary",
    className: "ai-col",
  },
  {
    id: "aiMessage",
    label: "AI Bericht",
    sortable: false,
    defaultVisible: false,
    automatable: "aiMessage",
    className: "ai-col",
  },
  {
    id: "aiNextStep",
    label: "Volgende stap",
    sortable: false,
    defaultVisible: false,
    automatable: "aiNextStep",
    className: "ai-col",
  },
  { id: "hubspot", label: "HubSpot", sortable: false, defaultVisible: false, automatable: "hubspot" },
  { id: "actions", label: "Acties", sortable: false, defaultVisible: true },
];

export const SORTABLE_FIELDS = new Set<SortField>(
  GRID_COLUMNS.filter((c) => c.sortable).map((c) => c.id as SortField)
);

export function customColumnToGridDef(col: CustomColumn): GridColumnDef {
  let automatable: GridColumnDef["automatable"];
  if (col.automation?.kind === "ai") automatable = `custom:${col.key}`;
  else if (col.automation?.kind === "enrich") automatable = "enrich";
  else if (col.automation?.kind === "research") automatable = `research:${col.key}`;
  else if (col.automation?.kind === "score") automatable = "score";
  else if (col.automation?.kind === "hubspot") automatable = "hubspot";

  return {
    id: col.key,
    label: col.label,
    sortable: col.type === "number" || col.type === "date",
    defaultVisible: col.visible,
    automatable,
    isCustom: true,
    customColumnId: col.id,
    columnType: col.type,
    selectOptions: col.selectOptions,
    className: col.automation?.kind === "ai" ? "ai-col" : undefined,
  };
}

export function buildGridColumns(customColumns: CustomColumn[] = []): GridColumnDef[] {
  const customDefs = customColumns
    .filter((c) => c.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(customColumnToGridDef);

  const actionsCol = GRID_COLUMNS.find((c) => c.id === "actions");
  const systemCols = GRID_COLUMNS.filter((c) => c.id !== "actions");
  return [...systemCols, ...customDefs, ...(actionsCol ? [actionsCol] : [])];
}

export function getColumnDef(id: string, customColumns: CustomColumn[] = []): GridColumnDef | undefined {
  const system = GRID_COLUMNS.find((c) => c.id === id);
  if (system) return system;
  const custom = customColumns.find((c) => c.key === id);
  return custom ? customColumnToGridDef(custom) : undefined;
}

export function getAllColumnIds(customColumns: CustomColumn[] = []): string[] {
  return buildGridColumns(customColumns).map((c) => c.id);
}

export const DEFAULT_VISIBLE_COLUMNS = GRID_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
