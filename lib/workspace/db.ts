import { createAdminClient } from "@/lib/supabase/admin";
import { validateLead } from "./validation";
import type { WorkspaceLead, WorkspaceLeadInput } from "./types";

const memoryLeads = new Map<string, WorkspaceLead>();
const memoryJobs = new Map<string, Record<string, unknown>>();

function rowToLead(row: Record<string, unknown>): WorkspaceLead {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workspace_id: String(row.workspace_id ?? "legacy-scale-models"),
    company_name: String(row.company_name ?? ""),
    domain: String(row.domain ?? ""),
    segment: String(row.segment ?? ""),
    fleet_brand: String(row.fleet_brand ?? ""),
    fleet_type: String(row.fleet_type ?? ""),
    evidence_summary: String(row.evidence_summary ?? ""),
    evidence_url: String(row.evidence_url ?? ""),
    confidence: (row.confidence as WorkspaceLead["confidence"]) ?? "Low",
    lead_fit: (row.lead_fit as WorkspaceLead["lead_fit"]) ?? "Weak",
    status: (row.status as WorkspaceLead["status"]) ?? "New",
    owner: String(row.owner ?? ""),
    next_action: String(row.next_action ?? ""),
    notes: String(row.notes ?? ""),
    validation_errors: Array.isArray(row.validation_errors)
      ? (row.validation_errors as string[])
      : [],
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function defaultLeadInput(): WorkspaceLeadInput {
  return {
    company_name: "",
    domain: "",
    segment: "",
    fleet_brand: "",
    fleet_type: "",
    evidence_summary: "",
    evidence_url: "",
    confidence: "Low",
    lead_fit: "Weak",
    status: "New",
    owner: "",
    next_action: "",
    notes: "",
  };
}

export async function getWorkspaceLead(
  userId: string,
  id: string
): Promise<WorkspaceLead | null> {
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("workspace_leads")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return rowToLead(data as Record<string, unknown>);
  }
  const lead = memoryLeads.get(id);
  return lead && lead.user_id === userId ? lead : null;
}

export async function listWorkspaceLeads(
  userId: string,
  workspaceId: string
): Promise<WorkspaceLead[]> {
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("workspace_leads")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => rowToLead(r as Record<string, unknown>));
  }

  return [...memoryLeads.values()].filter(
    (l) => l.user_id === userId && l.workspace_id === workspaceId
  );
}

export async function createWorkspaceLead(
  userId: string,
  workspaceId: string,
  input: Partial<WorkspaceLeadInput> = {}
): Promise<WorkspaceLead> {
  const merged = { ...defaultLeadInput(), ...input };
  const validation_errors = validateLead(merged);

  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("workspace_leads")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        ...merged,
        validation_errors,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const lead = rowToLead(data as Record<string, unknown>);
    await logAudit(supabase, userId, lead.id, "create", { company_name: lead.company_name });
    return lead;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const lead: WorkspaceLead = {
    id,
    user_id: userId,
    workspace_id: workspaceId,
    ...merged,
    validation_errors,
    created_at: now,
    updated_at: now,
  };
  memoryLeads.set(id, lead);
  return lead;
}

export async function updateWorkspaceLead(
  userId: string,
  id: string,
  patch: Partial<WorkspaceLeadInput>
): Promise<WorkspaceLead> {
  const supabase = createAdminClient();

  if (supabase) {
    const { data: existing, error: fetchErr } = await supabase
      .from("workspace_leads")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (fetchErr || !existing) throw new Error("Lead not found");

    const merged = { ...existing, ...patch };
    const validation_errors = validateLead(merged);

    const { data, error } = await supabase
      .from("workspace_leads")
      .update({ ...patch, validation_errors })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const lead = rowToLead(data as Record<string, unknown>);
    await logAudit(supabase, userId, id, "update", patch);
    return lead;
  }

  const current = memoryLeads.get(id);
  if (!current || current.user_id !== userId) throw new Error("Lead not found");
  const merged = { ...current, ...patch, updated_at: new Date().toISOString() };
  merged.validation_errors = validateLead(merged);
  memoryLeads.set(id, merged);
  return merged;
}

export async function deleteWorkspaceLeads(userId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const supabase = createAdminClient();

  if (supabase) {
    const { error, count } = await supabase
      .from("workspace_leads")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .in("id", ids);
    if (error) throw new Error(error.message);
    for (const id of ids) {
      await logAudit(supabase, userId, id, "delete", {});
    }
    return count ?? ids.length;
  }

  let n = 0;
  for (const id of ids) {
    const l = memoryLeads.get(id);
    if (l && l.user_id === userId) {
      memoryLeads.delete(id);
      n++;
    }
  }
  return n;
}

async function logAudit(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  leadId: string,
  action: string,
  payload: Record<string, unknown>
) {
  await supabase.from("workspace_audit_log").insert({
    user_id: userId,
    lead_id: leadId,
    action,
    payload,
  });
}

export async function listEnrichmentJobs(userId: string): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("workspace_enrichment_jobs")
      .select("*, workspace_leads(company_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  return [...memoryJobs.values()].filter((j) => j.user_id === userId);
}

export async function createEnrichmentJob(
  userId: string,
  leadId: string,
  result: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("workspace_enrichment_jobs").insert({
      user_id: userId,
      lead_id: leadId,
      status: "completed",
      provider: "mock",
      result,
      completed_at: new Date().toISOString(),
    });
    return;
  }
  memoryJobs.set(crypto.randomUUID(), { user_id: userId, lead_id: leadId, ...result });
}
