import type { Contact, Lead, LeadStatus } from "./types";
import type { CustomColumn } from "./types";

export function parseRowKey(rowKey: string): { leadId: string; contactId?: string } {
  const [leadId, contactId] = rowKey.split(":");
  return contactId ? { leadId, contactId } : { leadId };
}

function findLead(leads: Lead[], leadId: string): Lead | undefined {
  return leads.find((l) => l.id === leadId);
}

function isCustomColumn(colId: string, customColumns: CustomColumn[]): CustomColumn | undefined {
  return customColumns.find((c) => c.key === colId);
}

export function getCellValue(
  leads: Lead[],
  rowKey: string,
  colId: string,
  customColumns: CustomColumn[] = []
): string {
  const { leadId, contactId } = parseRowKey(rowKey);
  const lead = findLead(leads, leadId);
  if (!lead) return "";

  const custom = isCustomColumn(colId, customColumns);
  if (custom && !contactId) {
    const val = lead.customValues?.[custom.key];
    return val != null ? String(val) : "";
  }

  if (!contactId && colId.startsWith("custom:")) {
    const key = colId.slice(7);
    const val = lead.customValues?.[key];
    return val != null ? String(val) : "";
  }

  if (!contactId) {
    switch (colId) {
      case "company":
        return lead.company;
      case "sector":
        return lead.sector;
      case "city":
        return lead.city ?? "";
      case "country":
        return lead.country;
      case "market":
        return lead.market;
      case "fitReason":
        return lead.fitReason;
      case "status":
        return lead.status;
      case "website":
        return lead.website;
      case "sector":
        return lead.sector;
      case "batch":
        return lead.batch;
      default:
        return "";
    }
  }

  const contact = lead.contacts?.find((c) => c.id === contactId);
  if (!contact) return "";

  switch (colId) {
    case "fitReason":
      return contact.name;
    case "dmu":
      return contact.title;
    case "email":
      return contact.email;
    case "phone":
      return contact.phone;
    default:
      return "";
  }
}

export interface GridWriters {
  onUpdate: (id: string, updates: Partial<Lead>, immediate?: boolean) => void;
  onUpdateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
}

export function setCellValue(
  leads: Lead[],
  rowKey: string,
  colId: string,
  value: string,
  writers: GridWriters,
  customColumns: CustomColumn[] = [],
  immediate = true
): void {
  const { leadId, contactId } = parseRowKey(rowKey);
  const lead = findLead(leads, leadId);
  if (!lead) return;

  const custom = isCustomColumn(colId, customColumns);
  if (custom && !contactId) {
    writers.onUpdate(
      leadId,
      {
        customValues: {
          ...(lead.customValues ?? {}),
          [custom.key]: value,
        },
      },
      immediate
    );
    return;
  }

  if (!contactId && colId.startsWith("custom:")) {
    const key = colId.slice(7);
    writers.onUpdate(
      leadId,
      {
        customValues: {
          ...(lead.customValues ?? {}),
          [key]: value,
        },
      },
      immediate
    );
    return;
  }

  if (!contactId) {
    switch (colId) {
      case "company":
        writers.onUpdate(leadId, { company: value }, immediate);
        break;
      case "sector":
        writers.onUpdate(leadId, { sector: value }, immediate);
        break;
      case "city":
        writers.onUpdate(leadId, { city: value }, immediate);
        break;
      case "country":
        writers.onUpdate(leadId, { country: value }, immediate);
        break;
      case "market":
        writers.onUpdate(leadId, { market: value }, immediate);
        break;
      case "fitReason":
        writers.onUpdate(leadId, { fitReason: value }, immediate);
        break;
      case "website":
        writers.onUpdate(leadId, { website: value }, immediate);
        break;
      case "sector":
        writers.onUpdate(leadId, { sector: value }, immediate);
        break;
      case "batch":
        writers.onUpdate(leadId, { batch: value }, immediate);
        break;
      case "status":
        if (value === "qualified" || value === "not_qualified") {
          writers.onUpdate(leadId, { status: value as LeadStatus }, immediate);
        }
        break;
    }
    return;
  }

  const contact = lead.contacts?.find((c) => c.id === contactId);
  if (!contact) return;

  switch (colId) {
    case "fitReason":
      writers.onUpdateContact(leadId, contactId, { name: value });
      break;
    case "dmu":
      writers.onUpdateContact(leadId, contactId, { title: value });
      break;
    case "email":
      writers.onUpdateContact(leadId, contactId, { email: value });
      break;
    case "phone":
      writers.onUpdateContact(leadId, contactId, { phone: value });
      break;
  }
}
