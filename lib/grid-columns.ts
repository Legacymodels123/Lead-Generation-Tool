import type { SortField } from "./views";

export interface GridColumnDef {
  id: string;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  automatable?: "score" | "enrich" | "aiMessage" | "aiSummary" | "aiNextStep";
  className?: string;
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
  { id: "hubspot", label: "HubSpot", sortable: false, defaultVisible: false },
  { id: "actions", label: "Acties", sortable: false, defaultVisible: true },
];

export const SORTABLE_FIELDS = new Set<SortField>(
  GRID_COLUMNS.filter((c) => c.sortable).map((c) => c.id as SortField)
);

export function getColumnDef(id: string): GridColumnDef | undefined {
  return GRID_COLUMNS.find((c) => c.id === id);
}
