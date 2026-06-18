import type { Contact, Lead } from "@/lib/types";
import { applyHubSpotSyncToLead, syncLeadsToHubSpot } from "./sync";
import { HubSpotClient } from "./client";
import type { ColumnMapping } from "@/lib/types";

const DEFAULT_COMPANY_MAPPINGS: Record<string, string> = {
  company: "name",
  country: "country",
  sector: "industry",
  employees: "numberofemployees",
  website: "website",
  fitReason: "description",
  market: "description",
  score: "description",
};

export async function loadColumnMappings(
  workspaceId: string
): Promise<ColumnMapping[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { isCloudEnabled } = await import("@/lib/data/is-cloud");
  if (!isCloudEnabled()) return [];

  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("column_mappings")
    .select("*")
    .eq("workspace_id", workspaceId);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    sourceField: row.source_field as string,
    targetColumnKey: row.target_column_key as string,
    createdAt: row.created_at as string,
  }));
}

function leadFieldValue(lead: Lead, source: string): string {
  if (source in (lead.customValues ?? {})) {
    return String(lead.customValues?.[source] ?? "");
  }
  switch (source) {
    case "company":
      return lead.company;
    case "country":
      return lead.country;
    case "sector":
      return lead.sector;
    case "employees":
      return String(lead.employees ?? "");
    case "website":
      return lead.website;
    case "fitReason":
      return lead.fitReason;
    case "market":
      return lead.market;
    case "score":
      return lead.score != null ? String(lead.score) : "";
    default:
      return "";
  }
}

export function mapLeadToHubSpotProperties(
  lead: Lead,
  mappings: ColumnMapping[] = []
): Record<string, string> {
  const mappingMap = new Map(mappings.map((m) => [m.sourceField, m.targetColumnKey]));
  const properties: Record<string, string> = {
    name: lead.company,
    country: lead.country,
    industry: lead.sector,
    numberofemployees: String(lead.employees || ""),
    website: lead.website || "",
    description: [lead.fitReason, lead.aiSummary, lead.score != null ? `ICP: ${lead.score}%` : ""]
      .filter(Boolean)
      .join(" | "),
  };

  for (const [source, hubspotProp] of Object.entries(DEFAULT_COMPANY_MAPPINGS)) {
    if (mappingMap.has(source)) {
      const target = mappingMap.get(source)!;
      const value = leadFieldValue(lead, source);
      if (value) properties[target] = value;
    }
  }

  if (lead.customValues) {
    for (const [key, value] of Object.entries(lead.customValues)) {
      const target = mappingMap.get(key) ?? `lg_${key}`;
      if (value != null && String(value).trim()) {
        properties[target] = String(value);
      }
    }
  }

  return properties;
}

export async function syncLeadToHubSpotWithToken(
  lead: Lead,
  token: string,
  mappings: ColumnMapping[] = []
) {
  const client = new HubSpotClient(token);
  const properties = mapLeadToHubSpotProperties(lead, mappings);

  let companyId = lead.hubspotCompanyId;
  let companyCreated = false;

  if (companyId) {
    await client.updateCompanyProperties(companyId, properties);
  } else {
    const existing = await client.searchCompanyByName(lead.company);
    if (existing) {
      companyId = existing;
      await client.updateCompanyProperties(companyId, properties);
    } else {
      const created = await client.createCompany(properties);
      companyId = created.id;
      companyCreated = true;
    }
  }

  const contactIds: Record<string, string> = {};
  for (const contact of lead.contacts) {
    if (!contact.name && !contact.email) continue;
    const { id } = await client.createOrUpdateContact(contact, companyId!);
    contactIds[contact.id] = id;
  }

  return applyHubSpotSyncToLead(lead, {
    companyId: companyId!,
    contactIds,
    created: companyCreated,
  });
}

export async function syncLeadsToHubSpotWithToken(
  leads: Lead[],
  token: string,
  mappings: ColumnMapping[] = []
): Promise<Array<{ leadId: string; lead?: Lead; error?: string }>> {
  const results: Array<{ leadId: string; lead?: Lead; error?: string }> = [];

  for (const lead of leads) {
    try {
      const synced = await syncLeadToHubSpotWithToken(lead, token, mappings);
      results.push({ leadId: lead.id, lead: synced });
    } catch (e) {
      results.push({
        leadId: lead.id,
        error: e instanceof Error ? e.message : "HubSpot sync failed",
      });
    }
  }

  return results;
}
