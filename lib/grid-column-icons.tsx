import type { GridColumnDef } from "@/lib/grid-columns";

export function columnTypeIcon(col: GridColumnDef): { glyph: string; extra?: string } {
  if (col.columnType === "ai_enriched" || col.automatable?.toString().startsWith("custom:")) {
    return { glyph: "✦", extra: "ai" };
  }
  if (col.columnType === "select") return { glyph: "▾" };
  if (col.id === "email") return { glyph: "T", extra: "✉" };
  if (col.id === "phone") return { glyph: "T", extra: "☎" };
  if (col.id === "score" || col.columnType === "number") return { glyph: "#" };
  if (col.id === "status") return { glyph: "▾" };
  if (col.id === "hubspot") return { glyph: "⇄" };
  if (col.automatable === "enrich") return { glyph: "T", extra: "✉" };
  return { glyph: "T" };
}
