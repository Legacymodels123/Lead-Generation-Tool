import type { CustomColumn, CustomColumnType, ColumnConfig } from "@/lib/types";

export function validateCustomColumnKey(key: string): boolean {
  // Only alphanumeric and underscores, max 50 chars
  return /^[a-zA-Z0-9_]{1,50}$/.test(key);
}

export function sanitizeColumnLabel(label: string): string {
  return label.trim().slice(0, 100);
}

export function getDefaultColumnType(field: string): CustomColumnType {
  const lowerField = field.toLowerCase();

  if (lowerField.includes("email")) return "email";
  if (lowerField.includes("url") || lowerField.includes("link")) return "url";
  if (lowerField.includes("date")) return "date";
  if (lowerField.includes("count") || lowerField.includes("number")) return "number";

  return "text";
}

export function mergeCustomAndDefaultColumns(
  custom: CustomColumn[],
  defaultColumns: ColumnConfig[]
): (CustomColumn | ColumnConfig)[] {
  // Combine and sort by order
  const all = [
    ...defaultColumns,
    ...custom.map((c) => ({
      ...c,
      readonly: false,
    })),
  ];

  return all.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function createColumnKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50) || "column";
}

export function isValidCustomColumnType(type: string): type is CustomColumnType {
  return ["text", "number", "date", "select", "email", "url", "ai_enriched"].includes(type);
}

export const DRAWER_COLUMN_TYPES: CustomColumnType[] = ["text", "select", "ai_enriched"];

export function formatColumnValue(value: any, type: CustomColumnType): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "date":
      if (typeof value === "string") {
        const date = new Date(value);
        return date.toLocaleDateString("nl-NL");
      }
      return value;
    case "number":
      return Number(value).toLocaleString("nl-NL");
    case "email":
      return `<a href="mailto:${value}">${value}</a>`;
    case "url":
      return `<a href="${value}" target="_blank">${value}</a>`;
    default:
      return String(value);
  }
}
