import type { Batch, Contact, Lead } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";
import { defaultContactsForAccount, normalizeLead } from "@/lib/utils/contacts";

export interface LeadRow {
  id: string;
  user_id: string;
  workspace_id: string;
  company: string;
  country: string;
  market: string;
  employees: number;
  revenue: string;
  sector: string;
  fit_reason: string;
  website: string;
  linkedin_company_url: string;
  hubspot_company_id: string | null;
  contact_name: string;
  contact_title: string;
  linkedin_url: string;
  status: string;
  batch: string;
  is_new: boolean;
  notes: string;
  message: string;
  score: number | null;
  ai_message: string | null;
  ai_summary: string | null;
  ai_next_step: string | null;
}

export interface ContactRow {
  id: string;
  account_id: string;
  user_id: string;
  dmu_role: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  hubspot_contact_id: string | null;
  enrichment_status: string;
  email_confidence: string | null;
  ai_message: string | null;
  ai_summary: string | null;
  ai_next_step: string | null;
  message: string;
}

export interface BatchRow {
  id: string;
  user_id: string;
  workspace_id: string;
  date: string;
  label: string;
  lead_count: number;
  credits_used: number;
  created_at: string;
}

export function contactToRow(contact: Contact, userId: string): ContactRow {
  return {
    id: contact.id,
    account_id: contact.accountId,
    user_id: userId,
    dmu_role: contact.dmuRole,
    name: contact.name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedinUrl,
    hubspot_contact_id: contact.hubspotContactId ?? null,
    enrichment_status: contact.enrichmentStatus,
    email_confidence: contact.emailConfidence ?? null,
    ai_message: contact.aiMessage ?? null,
    ai_summary: contact.aiSummary ?? null,
    ai_next_step: contact.aiNextStep ?? null,
    message: contact.message ?? "",
  };
}

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    accountId: row.account_id,
    dmuRole: row.dmu_role as Contact["dmuRole"],
    name: row.name,
    title: row.title,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedin_url,
    hubspotContactId: row.hubspot_contact_id ?? undefined,
    enrichmentStatus: row.enrichment_status as Contact["enrichmentStatus"],
    emailConfidence: (row.email_confidence as Contact["emailConfidence"]) ?? undefined,
    aiMessage: row.ai_message ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiNextStep: row.ai_next_step ?? undefined,
    message: row.message,
  };
}

export function leadToRow(lead: Lead, userId: string): LeadRow {
  return {
    id: lead.id,
    user_id: userId,
    workspace_id: lead.workspaceId ?? DEFAULT_WORKSPACE_ID,
    company: lead.company,
    country: lead.country,
    market: lead.market,
    employees: lead.employees,
    revenue: lead.revenue,
    sector: lead.sector,
    fit_reason: lead.fitReason,
    website: lead.website,
    linkedin_company_url: lead.linkedinCompanyUrl,
    hubspot_company_id: lead.hubspotCompanyId ?? null,
    contact_name: lead.contactName,
    contact_title: lead.contactTitle,
    linkedin_url: lead.linkedinUrl,
    status: lead.status,
    batch: lead.batch,
    is_new: lead.isNew,
    notes: lead.notes,
    message: lead.message,
    score: lead.score ?? null,
    ai_message: lead.aiMessage ?? null,
    ai_summary: lead.aiSummary ?? null,
    ai_next_step: lead.aiNextStep ?? null,
  };
}

export function rowToLead(row: LeadRow, contacts: Contact[] = []): Lead {
  const base = normalizeLead({
    id: row.id,
    workspaceId: row.workspace_id,
    company: row.company,
    country: row.country,
    market: row.market,
    employees: row.employees,
    revenue: row.revenue,
    sector: row.sector,
    fitReason: row.fit_reason,
    website: row.website,
    linkedinCompanyUrl: row.linkedin_company_url,
    hubspotCompanyId: row.hubspot_company_id ?? undefined,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    linkedinUrl: row.linkedin_url,
    status: row.status as Lead["status"],
    batch: row.batch,
    isNew: row.is_new,
    notes: row.notes,
    message: row.message,
    score: row.score ?? undefined,
    aiMessage: row.ai_message ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiNextStep: row.ai_next_step ?? undefined,
    contacts: contacts.length ? contacts : defaultContactsForAccount({ id: row.id, contactName: row.contact_name, contactTitle: row.contact_title, linkedinUrl: row.linkedin_url }),
  });
  return base;
}

export function batchToRow(batch: Batch, userId: string, workspaceId = DEFAULT_WORKSPACE_ID): BatchRow {
  return {
    id: batch.id,
    user_id: userId,
    workspace_id: workspaceId,
    date: batch.date,
    label: batch.label,
    lead_count: batch.leadCount,
    credits_used: batch.creditsUsed,
    created_at: batch.createdAt,
  };
}

export function rowToBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    date: row.date,
    label: row.label,
    leadCount: row.lead_count,
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  };
}

export async function loadLeadsWithContacts(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  userId: string
): Promise<Lead[]> {
  if (!supabase) return [];

  const { data: leadRows, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !leadRows?.length) return [];

  const accountIds = (leadRows as LeadRow[]).map((r) => r.id);
  const { data: contactRows } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .in("account_id", accountIds);

  const contactsByAccount = new Map<string, Contact[]>();
  for (const row of (contactRows as ContactRow[] | null) ?? []) {
    const list = contactsByAccount.get(row.account_id) ?? [];
    list.push(rowToContact(row));
    contactsByAccount.set(row.account_id, list);
  }

  return (leadRows as LeadRow[]).map((row) =>
    rowToLead(row, contactsByAccount.get(row.id) ?? [])
  );
}

export async function saveContactsForLead(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>>,
  userId: string,
  lead: Lead
): Promise<void> {
  await supabase.from("contacts").delete().eq("account_id", lead.id).eq("user_id", userId);
  if (lead.contacts.length) {
    await supabase.from("contacts").insert(lead.contacts.map((c) => contactToRow(c, userId)));
  }
}
