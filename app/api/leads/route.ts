import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import {
  batchToRow,
  leadToRow,
  loadLeadsWithContacts,
  rowToBatch,
  saveContactsForLead,
  type BatchRow,
  type LeadRow,
} from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_LEADS } from "@/lib/seed-data";
import type { Batch, Lead } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";
import { normalizeLead } from "@/lib/utils/contacts";
import { fitScore, generateId } from "@/lib/utils";

function defaultBatches(userId: string): BatchRow[] {
  return [
    {
      id: "batch-1",
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      date: "2026-06-13",
      label: "Nightly batch — 13 juni 2026",
      lead_count: 5,
      credits_used: 50,
      created_at: "2026-06-13T02:00:00.000Z",
    },
    {
      id: "batch-2",
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      date: "2026-06-12",
      label: "Nightly batch — 12 juni 2026",
      lead_count: 5,
      credits_used: 50,
      created_at: "2026-06-12T02:00:00.000Z",
    },
  ];
}

async function seedIfEmpty(userId: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return supabase;

  for (const seed of SEED_LEADS) {
    const lead = normalizeLead({ ...seed, id: generateId() });
    const row = leadToRow(lead, userId);
    await supabase.from("leads").insert(row);
    await saveContactsForLead(supabase, userId, lead);
  }
  await supabase.from("batches").insert(defaultBatches(userId));
  return supabase;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await seedIfEmpty(auth.userId);
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const leads = await loadLeadsWithContacts(supabase, auth.userId);
  const { data: batchRows } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    leads,
    batches: (batchRows as BatchRow[] | null)?.map(rowToBatch) ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const raw = (await req.json()) as Lead;
  const lead = normalizeLead({ ...raw, score: raw.score ?? fitScore(raw) });
  const row = leadToRow(lead, auth.userId);
  const { data, error } = await supabase.from("leads").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await saveContactsForLead(supabase, auth.userId, lead);
  return NextResponse.json(await loadLeadsWithContacts(supabase, auth.userId).then((all) => all.find((l) => l.id === (data as LeadRow).id) ?? lead));
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const body = (await req.json()) as { leads: Lead[]; batches: Batch[] };
  await supabase.from("contacts").delete().eq("user_id", auth.userId);
  await supabase.from("leads").delete().eq("user_id", auth.userId);
  await supabase.from("batches").delete().eq("user_id", auth.userId);

  for (const l of body.leads) {
    const lead = normalizeLead(l);
    await supabase.from("leads").insert(leadToRow(lead, auth.userId));
    await saveContactsForLead(supabase, auth.userId, lead);
  }
  if (body.batches.length) {
    await supabase.from("batches").insert(body.batches.map((b) => batchToRow(b, auth.userId)));
  }

  return NextResponse.json({ ok: true });
}
