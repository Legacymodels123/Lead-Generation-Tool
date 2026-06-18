import type { Contact, Lead, LeadStatus } from "./types";

export function parseRowKey(rowKey: string): { leadId: string; contactId?: string } {
  const [leadId, contactId] = rowKey.split(":");
  return contactId ? { leadId, contactId } : { leadId };
}

function findLead(leads: Lead[], leadId: string): Lead | undefined {
  return leads.find((l) => l.id === leadId);
}

export function getCellValue(leads: Lead[], rowKey: string, colId: string): string {
  const { leadId, contactId } = parseRowKey(rowKey);
  const lead = findLead(leads, leadId);
  if (!lead) return "";

  if (!contactId) {
    switch (colId) {
      case "company":
        return lead.company;
      case "market":
        return lead.market;
      case "fitReason":
        return lead.fitReason;
      case "status":
        return lead.status;
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
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onUpdateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
}

export function setCellValue(
  leads: Lead[],
  rowKey: string,
  colId: string,
  value: string,
  writers: GridWriters
): void {
  const { leadId, contactId } = parseRowKey(rowKey);
  const lead = findLead(leads, leadId);
  if (!lead) return;

  if (!contactId) {
    switch (colId) {
      case "company":
        writers.onUpdate(leadId, { company: value });
        break;
      case "market":
        writers.onUpdate(leadId, { market: value });
        break;
      case "fitReason":
        writers.onUpdate(leadId, { fitReason: value });
        break;
      case "status":
        if (value === "qualified" || value === "not_qualified") {
          writers.onUpdate(leadId, { status: value as LeadStatus });
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
