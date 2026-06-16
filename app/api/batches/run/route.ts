import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import {
  batchLabel,
  draftsToLeads,
  generateBatchLeads,
  todayBatchDate,
} from "@/lib/automation/batch-generator";
import { getAiConfig } from "@/lib/automation/provider";
import {
  batchToRow,
  leadToRow,
  loadLeadsWithContacts,
  rowToBatch,
  saveContactsForLead,
  type BatchRow,
} from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Batch } from "@/lib/types";
import { NIGHTLY_BATCH_LEADS } from "@/lib/types";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    existingCompanies?: string[];
    count?: number;
    userName?: string;
  };

  const count = body.count ?? NIGHTLY_BATCH_LEADS;
  const existing = body.existingCompanies ?? [];
  const userName = body.userName ?? "Levi";

  const { apiKey, provider } = getAiConfig();
  const { drafts, source } = await generateBatchLeads(existing, count, userName);

  const batchDate = todayBatchDate();
  const newLeads = draftsToLeads(drafts, batchDate, userName, source);

  const batch: Batch = {
    id: generateId(),
    date: batchDate,
    label: batchLabel(source, new Date()),
    leadCount: newLeads.length,
    creditsUsed: 0,
    createdAt: new Date().toISOString(),
  };

  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("leads").update({ is_new: false }).eq("user_id", auth.userId);
    for (const lead of newLeads) {
      const { error: leadErr } = await supabase.from("leads").insert(leadToRow(lead, auth.userId));
      if (leadErr) {
        return NextResponse.json({ error: leadErr.message }, { status: 500 });
      }
      await saveContactsForLead(supabase, auth.userId, lead);
    }
    const { data: batchRow, error: batchErr } = await supabase
      .from("batches")
      .insert(batchToRow(batch, auth.userId))
      .select()
      .single();
    if (batchErr) {
      return NextResponse.json({ error: batchErr.message }, { status: 500 });
    }

    const allLeads = await loadLeadsWithContacts(supabase, auth.userId);

    return NextResponse.json({
      leads: newLeads,
      batch: rowToBatch(batchRow as BatchRow),
      allLeads,
      source,
      aiProvider: provider,
      aiPowered: Boolean(apiKey),
    });
  }

  return NextResponse.json({
    leads: newLeads,
    batch,
    source,
    aiProvider: provider,
    aiPowered: Boolean(apiKey),
  });
}
