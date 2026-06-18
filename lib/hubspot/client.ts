import type { Contact, Lead } from "@/lib/types";

export interface HubSpotSyncResult {
  companyId: string;
  contactIds: Record<string, string>;
  created: boolean;
}

export class HubSpotClient {
  private token: string;
  private base = "https://api.hubapi.com";

  constructor(token?: string) {
    this.token = token ?? process.env.HUBSPOT_ACCESS_TOKEN ?? "";
    if (!this.token) throw new Error("HUBSPOT_ACCESS_TOKEN not configured");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HubSpot ${res.status}: ${err.slice(0, 300)}`);
    }
    return res.json() as Promise<T>;
  }

  async searchCompanyByName(name: string): Promise<string | null> {
    const data = await this.request<{
      results: Array<{ id: string; properties: { name?: string } }>;
    }>("POST", "/crm/v3/objects/companies/search", {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "name",
              operator: "EQ",
              value: name,
            },
          ],
        },
      ],
      properties: ["name"],
      limit: 1,
    });
    return data.results[0]?.id ?? null;
  }

  async createOrUpdateCompany(lead: Lead): Promise<{ id: string; created: boolean }> {
    const properties: Record<string, string> = {
      name: lead.company,
      country: lead.country,
      industry: lead.sector,
      numberofemployees: String(lead.employees || ""),
      website: lead.website || "",
      description: lead.fitReason || lead.aiSummary || "",
    };

    if (lead.hubspotCompanyId) {
      await this.updateCompanyProperties(lead.hubspotCompanyId, properties);
      return { id: lead.hubspotCompanyId, created: false };
    }

    const existing = await this.searchCompanyByName(lead.company);
    if (existing) {
      await this.updateCompanyProperties(existing, properties);
      return { id: existing, created: false };
    }

    const created = await this.createCompany(properties);
    return { id: created.id, created: true };
  }

  async createCompany(properties: Record<string, string>): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/crm/v3/objects/companies", { properties });
  }

  async updateCompanyProperties(companyId: string, properties: Record<string, string>): Promise<void> {
    await this.request("PATCH", `/crm/v3/objects/companies/${companyId}`, { properties });
  }

  async createOrUpdateContact(
    contact: Contact,
    companyId: string
  ): Promise<{ id: string; created: boolean }> {
    const properties: Record<string, string> = {
      firstname: contact.name.split(" ")[0] || contact.name,
      lastname: contact.name.split(" ").slice(1).join(" ") || "",
      jobtitle: contact.title,
      email: contact.email || "",
      phone: contact.phone || "",
      hs_linkedin_url: contact.linkedinUrl || "",
      dmu_role: contact.dmuRole,
    };

    if (contact.hubspotContactId) {
      await this.request("PATCH", `/crm/v3/objects/contacts/${contact.hubspotContactId}`, {
        properties,
      });
      await this.associateContactToCompany(contact.hubspotContactId, companyId);
      return { id: contact.hubspotContactId, created: false };
    }

    const created = await this.request<{ id: string }>("POST", "/crm/v3/objects/contacts", {
      properties,
    });
    await this.associateContactToCompany(created.id, companyId);
    return { id: created.id, created: true };
  }

  async associateContactToCompany(contactId: string, companyId: string): Promise<void> {
    await this.request(
      "PUT",
      `/crm/v4/objects/contacts/${contactId}/associations/companies/${companyId}`,
      [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }]
    );
  }

  async createCompanyNote(companyId: string, body: string): Promise<void> {
    const note = await this.request<{ id: string }>("POST", "/crm/v3/objects/notes", {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: body,
      },
    });
    await this.request(
      "PUT",
      `/crm/v4/objects/notes/${note.id}/associations/companies/${companyId}`,
      [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 190 }]
    );
  }
}

export function isHubSpotConfigured(token?: string | null): boolean {
  return Boolean(token || process.env.HUBSPOT_ACCESS_TOKEN);
}
