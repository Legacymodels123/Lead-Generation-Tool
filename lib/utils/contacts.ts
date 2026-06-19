import type { Contact, Lead } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";
import { inferDmuRoleFromTitle } from "@/lib/dmu/roles";
import { generateId } from "@/lib/utils";

export function createEmptyContact(
  accountId: string,
  dmuRole: Contact["dmuRole"],
  partial?: Partial<Contact>
): Contact {
  return {
    id: generateId(),
    accountId,
    dmuRole,
    name: "",
    title: dmuRole === "ceo_owner" ? "CEO / Managing Director" : "Marketing / Brand Manager",
    email: "",
    phone: "",
    linkedinUrl: "",
    enrichmentStatus: "idle",
    message: "",
    ...partial,
  };
}

export function defaultContactsForAccount(lead: Partial<Lead> & { id: string }): Contact[] {
  const primaryRole = inferDmuRoleFromTitle(lead.contactTitle ?? "");
  const marketing =
    primaryRole === "marketing_brand"
      ? createEmptyContact(lead.id, "marketing_brand", {
          name: lead.contactName ?? "",
          title: lead.contactTitle ?? "",
          linkedinUrl: lead.linkedinUrl ?? "",
        })
      : createEmptyContact(lead.id, "marketing_brand");

  const ceo =
    primaryRole === "ceo_owner"
      ? createEmptyContact(lead.id, "ceo_owner", {
          name: lead.contactName ?? "",
          title: lead.contactTitle ?? "",
          linkedinUrl: lead.linkedinUrl ?? "",
        })
      : createEmptyContact(lead.id, "ceo_owner");

  return [marketing, ceo];
}

export function normalizeLead(lead: Partial<Lead> & { id: string }): Lead {
  const contacts =
    lead.contacts && lead.contacts.length >= 2
      ? lead.contacts
      : defaultContactsForAccount(lead);

  const primary = contacts.find((c) => c.dmuRole === "marketing_brand") ?? contacts[0];

  return {
    id: lead.id,
    workspaceId: lead.workspaceId ?? DEFAULT_WORKSPACE_ID,
    company: lead.company ?? "",
    city: lead.city ?? "",
    country: lead.country ?? "Nederland",
    market: lead.market ?? "",
    employees: lead.employees ?? 0,
    revenue: lead.revenue ?? "",
    sector: lead.sector ?? "",
    fitReason: lead.fitReason ?? "",
    website: lead.website ?? "",
    linkedinCompanyUrl: lead.linkedinCompanyUrl ?? "",
    hubspotCompanyId: lead.hubspotCompanyId,
    contactName: lead.contactName ?? primary?.name ?? "",
    contactTitle: lead.contactTitle ?? primary?.title ?? "",
    linkedinUrl: lead.linkedinUrl ?? primary?.linkedinUrl ?? "",
    status: lead.status ?? "not_qualified",
    batch: lead.batch ?? "",
    isNew: lead.isNew ?? true,
    notes: lead.notes ?? "",
    message: lead.message ?? "",
    score: lead.score,
    aiMessage: lead.aiMessage,
    aiSummary: lead.aiSummary,
    aiNextStep: lead.aiNextStep,
    aiStatus: lead.aiStatus,
    contacts,
    expanded: lead.expanded ?? false,
    customValues: lead.customValues,
    source: lead.source,
  };
}

export function syncPrimaryContactFields(lead: Lead): Lead {
  const marketing = lead.contacts.find((c) => c.dmuRole === "marketing_brand") ?? lead.contacts[0];
  if (!marketing) return lead;
  return {
    ...lead,
    contactName: marketing.name,
    contactTitle: marketing.title,
    linkedinUrl: marketing.linkedinUrl || lead.linkedinUrl,
  };
}

export function updateContactInLead(lead: Lead, contactId: string, updates: Partial<Contact>): Lead {
  const contacts = lead.contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c));
  return syncPrimaryContactFields({ ...lead, contacts });
}
