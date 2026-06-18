import type { LeadStatus } from "./types";

export type SortField =
  | "company"
  | "market"
  | "score"
  | "status"
  | "batch";

export type SortDir = "asc" | "desc";

export interface AdvancedFilters {
  minScore?: number;
  batch?: string;
  hasEmail?: boolean;
}

export interface LeadView {
  id: string;
  name: string;
  statusFilter: LeadStatus | "alle";
  search: string;
  sort?: { field: SortField; dir: SortDir };
  visibleColumns: string[];
  advancedFilters?: AdvancedFilters;
}

export const DEFAULT_VISIBLE_COLUMNS = [
  "company",
  "market",
  "fitReason",
  "dmu",
  "email",
  "phone",
  "score",
  "status",
  "batch",
  "aiSummary",
  "hubspot",
  "actions",
];

export const DEFAULT_VIEWS: LeadView[] = [
  {
    id: "alle",
    name: "Alle leads",
    statusFilter: "alle",
    search: "",
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
  },
  {
    id: "nieuw",
    name: "Nieuw",
    statusFilter: "nieuw",
    search: "",
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
  },
  {
    id: "hoge-fit",
    name: "Hoge fit",
    statusFilter: "alle",
    search: "",
    sort: { field: "score", dir: "desc" },
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
    advancedFilters: { minScore: 70 },
  },
];

const STORAGE_PREFIX = "legacy-leadgen-views-";

export function loadViews(userId: string): LeadView[] {
  if (typeof window === "undefined") return DEFAULT_VIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return DEFAULT_VIEWS;
    const parsed = JSON.parse(raw) as LeadView[];
    return parsed.length ? parsed : DEFAULT_VIEWS;
  } catch {
    return DEFAULT_VIEWS;
  }
}

export function saveViews(userId: string, views: LeadView[]): void {
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(views));
}

export function createView(name: string, base?: Partial<LeadView>): LeadView {
  return {
    id: `view-${Date.now()}`,
    name,
    statusFilter: "alle",
    search: "",
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
    ...base,
  };
}
