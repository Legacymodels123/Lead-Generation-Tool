import type { Lead, Contact } from "@/lib/types";

export function getCellValue(lead: Lead, key: string): string {
  switch (key) {
    case "company":
      return lead.company;
    case "market":
      return lead.market;
    case "sector":
      return lead.sector;
    case "fitReason":
      return lead.fitReason;
    case "employees":
      return lead.employees ? lead.employees.toString() : "";
    case "revenue":
      return lead.revenue;
    case "country":
      return lead.country;
    case "website":
      return lead.website;
    case "score":
      return lead.score ? lead.score.toString() : "0";
    case "aiQualificationScore":
      return lead.aiQualificationScore ? lead.aiQualificationScore.toString() : "0";
    case "status":
      return lead.status;
    case "batch":
      return lead.batch;
    case "notes":
      return lead.notes;
    case "aiSummary":
      return lead.aiSummary || "";
    case "source":
      return lead.source || "manual";
    default:
      return "";
  }
}

export function getColumnLabel(key: string): string {
  const labels: Record<string, string> = {
    company: "Bedrijf",
    market: "Markt",
    sector: "Sector",
    fitReason: "Waarom fit",
    employees: "Medewerkers",
    revenue: "Omzet",
    country: "Land",
    website: "Website",
    score: "Score",
    aiQualificationScore: "AI Score",
    status: "Status",
    batch: "Batch",
    notes: "Notities",
    aiSummary: "AI Samenvatting",
    source: "Bron",
  };
  return labels[key] || key;
}

export function isEditableColumn(key: string): boolean {
  const editableColumns = [
    "company",
    "market",
    "sector",
    "fitReason",
    "employees",
    "revenue",
    "website",
    "notes",
  ];
  return editableColumns.includes(key);
}

export function getColumnWidth(key: string): string {
  const widths: Record<string, string> = {
    company: "150px",
    market: "100px",
    sector: "120px",
    fitReason: "150px",
    employees: "100px",
    revenue: "100px",
    country: "80px",
    website: "120px",
    score: "80px",
    aiQualificationScore: "80px",
    status: "120px",
    batch: "100px",
    notes: "150px",
    aiSummary: "200px",
    source: "80px",
  };
  return widths[key] || "120px";
}
