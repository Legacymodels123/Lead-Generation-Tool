import type { Batch, Contact, Lead } from "@/lib/types";
import type { AiColumnKey } from "@/lib/types/automation";
import { buildApiHeaders } from "@/lib/api-headers";

export async function fetchCloudData(userId: string): Promise<{ leads: Lead[]; batches: Batch[] }> {
  const res = await fetch("/api/leads", { headers: await buildApiHeaders() });
  if (!res.ok) throw new Error("Kon cloud data niet laden");
  return res.json();
}

export async function patchCloudLead(
  userId: string,
  id: string,
  updates: Partial<Lead>
): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: await buildApiHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Kon lead niet opslaan");
  return res.json();
}

export async function postCloudLead(userId: string, lead: Lead): Promise<Lead> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error("Kon lead niet toevoegen");
  return res.json();
}

export async function recalculateCloudScores(userId: string, ids: string[]): Promise<Lead[]> {
  const res = await fetch("/api/leads/recalculate", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Automatisering mislukt");
  return res.json();
}

export async function runAiColumnsCloud(
  userId: string,
  leadIds: string[],
  columns?: AiColumnKey[],
  leads?: Lead[]
): Promise<Lead[]> {
  const res = await fetch("/api/automations/run", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ leadIds, columns, leads }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "AI kolommen mislukt");
  }
  return res.json();
}

export interface BatchRunResult {
  leads: Lead[];
  batch: Batch;
  allLeads?: Lead[];
  source: "ai" | "templates";
}

export async function runBatchCloud(
  userId: string,
  existingCompanies: string[],
  userName: string,
  count?: number
): Promise<BatchRunResult> {
  const res = await fetch("/api/batches/run", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ existingCompanies, userName, count }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Batch mislukt");
  }
  return res.json();
}

export async function enrichLeadsCloud(
  userId: string,
  leadIds: string[],
  leads?: Lead[]
): Promise<{ leads: Lead[]; aiPowered: boolean }> {
  const res = await fetch("/api/leads/enrich", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ leadIds, leads, enrichContacts: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Verrijking mislukt");
  }
  return res.json();
}

export async function syncHubSpotCloud(
  userId: string,
  leadIds: string[],
  leads?: Lead[],
  includeTimelineNote?: boolean
): Promise<{ leads: Lead[]; synced: number; failed: number }> {
  const res = await fetch("/api/hubspot/sync", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ leadIds, leads, includeTimelineNote }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "HubSpot sync mislukt");
  }
  return res.json();
}

export async function fetchServiceStatus(): Promise<{
  cloud: boolean;
  ai: boolean;
  openai: boolean;
  anthropic: boolean;
  aiProvider: "openai" | "anthropic" | null;
  supabasePublic: boolean;
  supabaseAnonKey?: boolean;
  supabaseServerKey?: boolean;
  missingEnv?: string[];
  hubspot?: boolean;
  supabaseAuth?: boolean;
}> {
  const res = await fetch("/api/health/status");
  if (!res.ok) {
    return {
      cloud: false,
      ai: false,
      openai: false,
      anthropic: false,
      aiProvider: null,
      supabasePublic: false,
      missingEnv: ["NEXT_PUBLIC_SUPABASE_URL"],
    };
  }
  return res.json();
}

export async function saveCloudSnapshot(
  userId: string,
  leads: Lead[],
  batches: Batch[]
): Promise<void> {
  const res = await fetch("/api/leads", {
    method: "PUT",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ leads, batches }),
  });
  if (!res.ok) throw new Error("Kon snapshot niet opslaan");
}

export async function updateContactCloud(
  userId: string,
  leadId: string,
  contactId: string,
  updates: Partial<Contact>,
  lead: Lead
): Promise<Lead> {
  const contacts = lead.contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c));
  return patchCloudLead(userId, leadId, { ...lead, contacts });
}

export async function dispatchWebhookCloud(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await fetch("/api/integrations/webhook", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ event, data }),
  }).catch(() => {});
}

export async function pushInstantlyCloud(
  userId: string,
  leadIds: string[],
  campaignId: string,
  leads?: Lead[]
): Promise<{ added: number; errors: string[] }> {
  const res = await fetch("/api/integrations/instantly", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ leadIds, campaignId, leads }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Instantly mislukt");
  }
  return res.json();
}

export async function syncUserSettingsCloud(
  userId: string,
  settings: Record<string, unknown>
): Promise<void> {
  await fetch("/api/settings", {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(settings),
  }).catch(() => {});
}
