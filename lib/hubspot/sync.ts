import { HubSpotClient, type HubSpotSyncResult } from "./client";
import type { Contact, Lead } from "@/lib/types";

export async function syncLeadToHubSpot(lead: Lead): Promise<HubSpotSyncResult> {
  const client = new HubSpotClient();
  const { id: companyId, created: companyCreated } = await client.createOrUpdateCompany(lead);

  const contactIds: Record<string, string> = {};
  for (const contact of lead.contacts) {
    if (!contact.name && !contact.email) continue;
    const { id } = await client.createOrUpdateContact(contact, companyId);
    contactIds[contact.id] = id;
  }

  return {
    companyId,
    contactIds,
    created: companyCreated,
  };
}

export async function syncLeadsToHubSpot(leads: Lead[]): Promise<
  Array<{ leadId: string; result?: HubSpotSyncResult; error?: string }>
> {
  const results: Array<{ leadId: string; result?: HubSpotSyncResult; error?: string }> = [];

  for (const lead of leads) {
    try {
      const result = await syncLeadToHubSpot(lead);
      results.push({ leadId: lead.id, result });
    } catch (e) {
      results.push({
        leadId: lead.id,
        error: e instanceof Error ? e.message : "HubSpot sync failed",
      });
    }
  }

  return results;
}

export function applyHubSpotSyncToLead(
  lead: Lead,
  sync: HubSpotSyncResult
): Lead {
  return {
    ...lead,
    hubspotCompanyId: sync.companyId,
    contacts: lead.contacts.map((c) => ({
      ...c,
      hubspotContactId: sync.contactIds[c.id] ?? c.hubspotContactId,
    })),
  };
}
