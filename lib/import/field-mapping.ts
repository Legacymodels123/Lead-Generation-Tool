import type { CustomColumn, Lead, LeadStatus } from "@/lib/types";
import type { ParsedCsv } from "./parse-csv";

/** skip | lead field | contact field | existing custom:key | create new property */
export type ImportTargetId =
  | "skip"
  | "company"
  | "country"
  | "city"
  | "market"
  | "sector"
  | "employees"
  | "revenue"
  | "fitReason"
  | "website"
  | "linkedinCompanyUrl"
  | "notes"
  | "batch"
  | "message"
  | "status"
  | "firstName"
  | "lastName"
  | "contactName"
  | "contactTitle"
  | "email"
  | "phone"
  | "linkedinUrl"
  | `custom:${string}`
  | "new_property";

export interface ColumnMapping {
  csvHeader: string;
  target: ImportTargetId;
  newPropertyLabel?: string;
}

export interface ImportFieldOption {
  id: ImportTargetId;
  label: string;
  group: "skip" | "company" | "contact" | "custom";
}

export interface ImportLeadDraft {
  lead: Omit<Partial<Lead>, "contacts"> & {
    contacts?: Array<{ email?: string; phone?: string; name?: string; title?: string; linkedinUrl?: string }>;
    customValues?: Record<string, string>;
  };
}

const ALIASES: Record<string, ImportTargetId> = {
  company: "company",
  "company name": "company",
  bedrijf: "company",
  organisatie: "company",
  organization: "company",
  account: "company",
  naam: "company",
  city: "city",
  woonplaats: "city",
  plaats: "city",
  country: "country",
  land: "country",
  geography: "country",
  location: "country",
  market: "market",
  markt: "market",
  sector: "sector",
  industry: "sector",
  branche: "sector",
  employees: "employees",
  "# employees": "employees",
  "company size": "employees",
  "number of employees": "employees",
  medewerkers: "employees",
  revenue: "revenue",
  omzet: "revenue",
  turnover: "revenue",
  "fit reason": "fitReason",
  fitreason: "fitReason",
  "waarom fit": "fitReason",
  website: "website",
  url: "website",
  domain: "website",
  "company linkedin url": "linkedinCompanyUrl",
  "company linkedin": "linkedinCompanyUrl",
  "linkedin company": "linkedinCompanyUrl",
  notes: "notes",
  opmerkingen: "notes",
  comments: "notes",
  batch: "batch",
  message: "message",
  bericht: "message",
  status: "status",
  "first name": "firstName",
  "first name (unformatted)": "firstName",
  voornaam: "firstName",
  "last name": "lastName",
  "last name (unformatted)": "lastName",
  achternaam: "lastName",
  name: "contactName",
  "full name": "contactName",
  contact: "contactName",
  "contact name": "contactName",
  contactnaam: "contactName",
  title: "contactTitle",
  "job title": "contactTitle",
  functie: "contactTitle",
  rol: "contactTitle",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  mail: "email",
  phone: "phone",
  telefoon: "phone",
  telephone: "phone",
  mobile: "phone",
  "person linkedin url": "linkedinUrl",
  "linkedin url": "linkedinUrl",
  linkedin: "linkedinUrl",
  "linkedin profile": "linkedinUrl",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 50) || "field"
  );
}

export function buildImportFieldOptions(customColumns: CustomColumn[]): ImportFieldOption[] {
  const system: ImportFieldOption[] = [
    { id: "skip", label: "Skip column", group: "skip" },
    { id: "company", label: "Company name", group: "company" },
    { id: "sector", label: "Industry", group: "company" },
    { id: "city", label: "City", group: "company" },
    { id: "country", label: "Country", group: "company" },
    { id: "market", label: "Market", group: "company" },
    { id: "employees", label: "Employees", group: "company" },
    { id: "revenue", label: "Revenue", group: "company" },
    { id: "fitReason", label: "Fit reason", group: "company" },
    { id: "website", label: "Website", group: "company" },
    { id: "linkedinCompanyUrl", label: "Company LinkedIn", group: "company" },
    { id: "notes", label: "Notes", group: "company" },
    { id: "batch", label: "Batch", group: "company" },
    { id: "message", label: "Message", group: "company" },
    { id: "status", label: "Status", group: "company" },
    { id: "firstName", label: "First name (contact)", group: "contact" },
    { id: "lastName", label: "Last name (contact)", group: "contact" },
    { id: "contactName", label: "Contact name", group: "contact" },
    { id: "contactTitle", label: "Job title", group: "contact" },
    { id: "email", label: "Email", group: "contact" },
    { id: "phone", label: "Phone", group: "contact" },
    { id: "linkedinUrl", label: "Contact LinkedIn", group: "contact" },
  ];

  const custom: ImportFieldOption[] = customColumns.map((c) => ({
    id: `custom:${c.key}` as ImportTargetId,
    label: c.label,
    group: "custom" as const,
  }));

  return [
    ...system,
    ...custom,
    { id: "new_property", label: "+ Create new property", group: "custom" },
  ];
}

function matchCustomColumn(header: string, customColumns: CustomColumn[]): ImportTargetId | null {
  const norm = normalizeHeader(header);
  const slug = slugify(header);

  for (const col of customColumns) {
    if (normalizeHeader(col.label) === norm || col.key === slug || col.key === norm.replace(/\s/g, "_")) {
      return `custom:${col.key}`;
    }
  }

  for (const col of customColumns) {
    const labelNorm = normalizeHeader(col.label);
    if (labelNorm.includes(norm) || norm.includes(labelNorm)) {
      return `custom:${col.key}`;
    }
  }

  return null;
}

export function suggestColumnMappings(
  headers: string[],
  customColumns: CustomColumn[],
  autoCreateUnmapped = true
): ColumnMapping[] {
  const usedTargets = new Set<ImportTargetId>();

  return headers.map((csvHeader) => {
    const norm = normalizeHeader(csvHeader);
    let target: ImportTargetId =
      ALIASES[norm] ?? matchCustomColumn(csvHeader, customColumns) ?? "skip";

    if (target !== "skip" && usedTargets.has(target)) {
      if (target === "firstName" || target === "lastName") {
        // allow duplicate name parts from different exports
      } else if (!target.startsWith("custom:")) {
        target = autoCreateUnmapped ? "new_property" : "skip";
      }
    }

    if (target === "skip" && autoCreateUnmapped) {
      const customMatch = matchCustomColumn(csvHeader, customColumns);
      if (customMatch) {
        target = customMatch;
      } else if (!ALIASES[norm]) {
        target = "new_property";
      }
    }

    if (target !== "skip" && !target.startsWith("custom:") && target !== "new_property") {
      usedTargets.add(target);
    }

    return {
      csvHeader,
      target,
      newPropertyLabel: target === "new_property" ? csvHeader.trim() : undefined,
    };
  });
}

function parseEmployees(value: string): number {
  if (!value) return 0;
  const match = value.replace(/,/g, "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseCountry(value: string): string {
  if (!value) return "";
  const v = value.toLowerCase();
  if (v.includes("neder") || v.includes("holland") || v === "nl") return "Nederland";
  if (v.includes("belgi") || v === "be") return "België";
  if (v.includes("duits") || v.includes("germany") || v === "de") return "Duitsland";
  return value.trim();
}

function parseStatus(value: string): LeadStatus {
  const v = value.toLowerCase().trim();
  if (v.includes("qual") && !v.includes("not")) return "qualified";
  if (v === "yes" || v === "ja") return "qualified";
  return "not_qualified";
}

export function applyColumnMappings(csv: ParsedCsv, mappings: ColumnMapping[]): ImportLeadDraft[] {
  const drafts: ImportLeadDraft[] = [];

  for (const row of csv.rows) {
    const lead: ImportLeadDraft["lead"] = {
      customValues: {},
      contacts: [{}],
    };
    let firstName = "";
    let lastName = "";

    for (const map of mappings) {
      const raw = row[map.csvHeader]?.trim() ?? "";
      if (!raw && map.target !== "company") continue;

      switch (map.target) {
        case "skip":
          break;
        case "company":
          lead.company = raw;
          break;
        case "country":
          lead.country = parseCountry(raw);
          break;
        case "market":
          lead.market = raw;
          break;
        case "sector":
          lead.sector = raw;
          break;
        case "city":
          lead.city = raw;
          break;
        case "employees":
          lead.employees = parseEmployees(raw);
          break;
        case "revenue":
          lead.revenue = raw;
          break;
        case "fitReason":
          lead.fitReason = raw;
          break;
        case "website":
          lead.website = raw;
          break;
        case "linkedinCompanyUrl":
          lead.linkedinCompanyUrl = raw;
          break;
        case "notes":
          lead.notes = raw;
          break;
        case "batch":
          lead.batch = raw;
          break;
        case "message":
          lead.message = raw;
          break;
        case "status":
          lead.status = parseStatus(raw);
          break;
        case "firstName":
          firstName = raw;
          break;
        case "lastName":
          lastName = raw;
          break;
        case "contactName":
          lead.contactName = raw;
          lead.contacts![0].name = raw;
          break;
        case "contactTitle":
          lead.contactTitle = raw;
          lead.contacts![0].title = raw;
          break;
        case "email":
          lead.contacts![0].email = raw;
          break;
        case "phone":
          lead.contacts![0].phone = raw;
          break;
        case "linkedinUrl":
          lead.linkedinUrl = raw;
          lead.contacts![0].linkedinUrl = raw;
          break;
        case "new_property": {
          const key = slugify(map.newPropertyLabel ?? map.csvHeader);
          lead.customValues![key] = raw;
          break;
        }
        default:
          if (map.target.startsWith("custom:")) {
            const key = map.target.slice(7);
            lead.customValues![key] = raw;
          }
      }
    }

    const combinedName = `${firstName} ${lastName}`.trim();
    if (combinedName && !lead.contactName) {
      lead.contactName = combinedName;
      lead.contacts![0].name = combinedName;
    }

    if (!lead.company?.trim()) continue;

    if (!lead.contactName) lead.contactName = lead.contacts![0].name || "Unknown";
    if (!lead.country) lead.country = "Nederland";
    if (!lead.status) lead.status = "not_qualified";

    const hasContactData = Object.values(lead.contacts![0]).some(Boolean);
    if (!hasContactData) delete lead.contacts;

    if (Object.keys(lead.customValues!).length === 0) delete lead.customValues;

    drafts.push({ lead });
  }

  return drafts;
}

export function getMappingDisplayLabel(
  mapping: ColumnMapping,
  options: ImportFieldOption[]
): string {
  if (mapping.target === "skip") return "";
  if (mapping.target === "new_property") {
    return (mapping.newPropertyLabel ?? mapping.csvHeader).trim();
  }
  return options.find((o) => o.id === mapping.target)?.label ?? mapping.target;
}

export function countNewProperties(mappings: ColumnMapping[]): number {
  return mappings.filter((m) => m.target === "new_property").length;
}

export function countMapped(mappings: ColumnMapping[]): number {
  return mappings.filter((m) => m.target !== "skip").length;
}

export function collectNewProperties(mappings: ColumnMapping[]): { label: string; key: string }[] {
  const seen = new Set<string>();
  const result: { label: string; key: string }[] = [];

  for (const map of mappings) {
    if (map.target !== "new_property") continue;
    const label = (map.newPropertyLabel ?? map.csvHeader).trim();
    const key = slugify(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ label, key });
  }

  return result;
}

export function resolveMappingsAfterCreate(
  mappings: ColumnMapping[],
  created: CustomColumn[]
): ColumnMapping[] {
  const byKey = new Map(created.map((c) => [slugify(c.label), c]));

  return mappings.map((m) => {
    if (m.target !== "new_property") return m;
    const label = (m.newPropertyLabel ?? m.csvHeader).trim();
    const col = byKey.get(slugify(label));
    if (!col) return m;
    return { ...m, target: `custom:${col.key}` as ImportTargetId, newPropertyLabel: undefined };
  });
}

export { slugify };
