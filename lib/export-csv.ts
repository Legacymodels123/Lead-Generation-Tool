import type { Lead } from "./types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportLeadsToCsv(leads: Lead[], filename = "leads-export.csv"): void {
  const headers = [
    "Bedrijf",
    "Land",
    "Markt",
    "Sector",
    "Fit score",
    "Status",
    "Batch",
    "Waarom fit",
    "Contact",
    "Functie",
    "E-mail",
    "Telefoon",
    "AI Samenvatting",
    "AI Bericht",
    "HubSpot ID",
  ];

  const rows = leads.map((lead) => {
    const primary = lead.contacts[0];
    return [
      lead.company,
      lead.country,
      lead.market,
      lead.sector,
      String(lead.score ?? ""),
      lead.status,
      lead.batch,
      lead.fitReason,
      primary?.name ?? lead.contactName,
      primary?.title ?? lead.contactTitle,
      primary?.email ?? "",
      primary?.phone ?? "",
      lead.aiSummary ?? "",
      lead.aiMessage ?? "",
      lead.hubspotCompanyId ?? "",
    ].map(escapeCsv);
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
