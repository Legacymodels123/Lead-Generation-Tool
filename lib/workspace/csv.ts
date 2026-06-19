import type { WorkspaceLead, WorkspaceLeadInput } from "./types";

const CSV_COLUMNS: (keyof WorkspaceLeadInput)[] = [
  "company_name",
  "domain",
  "segment",
  "fleet_brand",
  "fleet_type",
  "evidence_summary",
  "evidence_url",
  "confidence",
  "lead_fit",
  "status",
  "owner",
  "next_action",
  "notes",
];

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function leadsToCsv(leads: WorkspaceLead[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = leads.map((l) =>
    CSV_COLUMNS.map((c) => escapeCsv(String(l[c] ?? ""))).join(",")
  );
  return [header, ...rows].join("\n");
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

export function csvToLeadInputs(text: string): Partial<WorkspaceLeadInput>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const results: Partial<WorkspaceLeadInput>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    results.push({
      company_name: row.company_name ?? row.company ?? "",
      domain: row.domain ?? row.website ?? "",
      segment: row.segment ?? "",
      fleet_brand: row.fleet_brand ?? "",
      fleet_type: row.fleet_type ?? "",
      evidence_summary: row.evidence_summary ?? "",
      evidence_url: row.evidence_url ?? "",
      confidence: (row.confidence as WorkspaceLeadInput["confidence"]) || "Low",
      lead_fit: (row.lead_fit as WorkspaceLeadInput["lead_fit"]) || "Weak",
      status: (row.status as WorkspaceLeadInput["status"]) || "New",
      owner: row.owner ?? "",
      next_action: row.next_action ?? "",
      notes: row.notes ?? "",
    });
  }
  return results;
}
