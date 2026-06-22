import type { Lead, LeadStatus } from "@/lib/types";
import type { CustomColumn } from "@/lib/types";

/** Map grid column id to a lead patch for API saves */
export function leadPatchFromColId(
  colId: string,
  value: string,
  customColumns: CustomColumn[] = []
): Partial<Lead> {
  const custom = customColumns.find((c) => c.key === colId);
  if (custom) {
    return { customValues: { [custom.key]: value } };
  }

  if (colId.startsWith("custom:")) {
    const key = colId.slice(7);
    return { customValues: { [key]: value } };
  }

  switch (colId) {
    case "company":
      return { company: value };
    case "sector":
      return { sector: value };
    case "city":
      return { city: value };
    case "country":
      return { country: value };
    case "market":
      return { market: value };
    case "fitReason":
      return { fitReason: value };
    case "website":
      return { website: value };
    case "batch":
      return { batch: value };
    case "status":
      if (value === "qualified" || value === "not_qualified") {
        return { status: value as LeadStatus };
      }
      return {};
    default:
      return {};
  }
}

export function emptyLeadDefaults(): Omit<Lead, "id" | "workspaceId"> {
  return {
    company: "",
    city: "",
    country: "",
    market: "",
    employees: 0,
    revenue: "",
    sector: "",
    fitReason: "",
    website: "",
    linkedinCompanyUrl: "",
    contactName: "",
    contactTitle: "",
    linkedinUrl: "",
    status: "not_qualified",
    batch: "manual",
    isNew: true,
    notes: "",
    message: "",
    contacts: [],
  };
}
