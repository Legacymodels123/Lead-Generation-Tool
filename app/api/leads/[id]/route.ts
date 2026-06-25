import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import {
  leadToRow,
  loadLeadsWithContacts,
  rowToLead,
  saveContactsForLead,
  type LeadRow,
} from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { normalizeLead, syncPrimaryContactFields } from "@/lib/utils/contacts";
import { fitScore } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { id } = await params;
  const updates = (await req.json()) as Partial<Lead>;

  const all = await loadLeadsWithContacts(supabase, auth.userId, auth.workspaceId);
  const existing = all.find((l) => l.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const merged = syncPrimaryContactFields(
    normalizeLead({ ...existing, ...updates, id })
  );
  merged.score = fitScore(merged);

  const row = leadToRow(merged, auth.userId);
  const { data, error } = await supabase
    .from("leads")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .eq("workspace_id", auth.workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await saveContactsForLead(supabase, auth.userId, merged);
  return NextResponse.json(rowToLead(data as LeadRow, merged.contacts));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { id } = await params;
  await supabase.from("contacts").delete().eq("account_id", id);
  await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId)
    .eq("workspace_id", auth.workspaceId);
  return NextResponse.json({ ok: true });
}
