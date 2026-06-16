import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { loadLeadsWithContacts, leadToRow, saveContactsForLead } from "@/lib/data/leads-db";
import { applyHubSpotSyncToLead, syncLeadsToHubSpot } from "@/lib/hubspot/sync";
import { isHubSpotConfigured } from "@/lib/hubspot/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { normalizeLead } from "@/lib/utils/contacts";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: "HUBSPOT_ACCESS_TOKEN niet geconfigureerd" },
      { status: 503 }
    );
  }

  const body = (await req.json()) as { leadIds: string[]; leads?: Lead[] };
  const { leadIds } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let targets: Lead[] = [];

  if (supabase) {
    const all = await loadLeadsWithContacts(supabase, auth.userId);
    const idSet = new Set(leadIds);
    targets = all.filter((l) => idSet.has(l.id));
  } else if (body.leads?.length) {
    const idSet = new Set(leadIds);
    targets = body.leads.filter((l) => idSet.has(l.id)).map((l) => normalizeLead(l));
  }

  if (!targets.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const syncResults = await syncLeadsToHubSpot(targets);
  const updated: Lead[] = [];

  for (const item of syncResults) {
    const lead = targets.find((l) => l.id === item.leadId);
    if (!lead) continue;

    if (item.error) {
      if (supabase) {
        await supabase.from("hubspot_sync_log").insert({
          id: generateId(),
          user_id: auth.userId,
          account_id: lead.id,
          status: "error",
          error: item.error,
        });
      }
      continue;
    }

    const synced = applyHubSpotSyncToLead(lead, item.result!);
    updated.push(synced);

    if (supabase) {
      await supabase
        .from("leads")
        .update({
          ...leadToRow(synced, auth.userId),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .eq("user_id", auth.userId);
      await saveContactsForLead(supabase, auth.userId, synced);
      await supabase.from("hubspot_sync_log").insert({
        id: generateId(),
        user_id: auth.userId,
        account_id: lead.id,
        hubspot_company_id: item.result!.companyId,
        status: "success",
      });
    }
  }

  const errors = syncResults.filter((r) => r.error);
  return NextResponse.json({
    leads: updated,
    synced: updated.length,
    failed: errors.length,
    errors: errors.map((e) => ({ leadId: e.leadId, error: e.error })),
  });
}

export async function GET() {
  return NextResponse.json({ configured: isHubSpotConfigured() });
}
