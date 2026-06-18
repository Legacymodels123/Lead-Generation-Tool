import type { Lead } from "./types";
import type { AdvancedFilters, LeadView, SortDir, SortField } from "./views";

export function applyLeadFilters(leads: Lead[], view: LeadView): Lead[] {
  const { statusFilter, search, advancedFilters } = view;
  const q = search.trim().toLowerCase();

  return leads.filter((p) => {
    if (statusFilter !== "alle" && p.status !== statusFilter) return false;

    if (q) {
      const matches =
        p.company.toLowerCase().includes(q) ||
        p.contactName.toLowerCase().includes(q) ||
        p.market.toLowerCase().includes(q) ||
        p.contacts.some(
          (c) =>
            c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        );
      if (!matches) return false;
    }

    if (advancedFilters?.minScore != null && (p.score ?? 0) < advancedFilters.minScore) {
      return false;
    }
    if (advancedFilters?.batch && p.batch !== advancedFilters.batch) return false;
    if (advancedFilters?.hasEmail) {
      const hasEmail = p.contacts.some((c) => c.email.trim().length > 0);
      if (!hasEmail) return false;
    }

    return true;
  });
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "nl", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function sortLeads(
  leads: Lead[],
  field: SortField | undefined,
  dir: SortDir | undefined
): Lead[] {
  if (!field || !dir) return leads;

  return [...leads].sort((a, b) => {
    switch (field) {
      case "company":
        return compareValues(a.company, b.company, dir);
      case "market":
        return compareValues(a.market, b.market, dir);
      case "score":
        return compareValues(a.score ?? 0, b.score ?? 0, dir);
      case "status":
        return compareValues(a.status, b.status, dir);
      case "batch":
        return compareValues(a.batch, b.batch, dir);
      default:
        return 0;
    }
  });
}

export function filterAndSortLeads(leads: Lead[], view: LeadView): Lead[] {
  const filtered = applyLeadFilters(leads, view);
  return sortLeads(filtered, view.sort?.field, view.sort?.dir);
}
