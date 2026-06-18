import type { ColumnCondition, CustomColumn, Lead } from "@/lib/types";

export function getFieldValue(lead: Lead, field: string): string {
  if (field.startsWith("custom:")) {
    const key = field.slice(7);
    const v = lead.customValues?.[key];
    return v === null || v === undefined ? "" : String(v);
  }
  if (field === "status") return lead.status;
  if (field === "market") return lead.market;
  if (field === "company") return lead.company;
  if (field === "fitReason") return lead.fitReason;
  return "";
}

export function evaluateCondition(lead: Lead, condition?: ColumnCondition): boolean {
  if (!condition?.field) return true;
  const actual = getFieldValue(lead, condition.field);
  switch (condition.operator) {
    case "empty":
      return actual.trim() === "";
    case "not_empty":
      return actual.trim() !== "";
    case "neq":
      return actual !== (condition.value ?? "");
    case "eq":
    default:
      return actual === (condition.value ?? "");
  }
}

export function isColumnVisibleForLead(column: CustomColumn, lead: Lead): boolean {
  return evaluateCondition(lead, column.condition);
}

export function shouldRunAiForLead(column: CustomColumn, lead: Lead): boolean {
  if (column.type !== "ai_enriched") return false;
  if (!column.condition) return true;
  return evaluateCondition(lead, column.condition);
}
