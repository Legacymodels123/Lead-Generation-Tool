import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { loadLeadsWithContacts, rowToLead, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { fitScore } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { ids } = (await req.json()) as { ids: string[] };
  if (!ids?.length) {
    return NextResponse.json({ error: "No leads selected" }, { status: 400 });
  }

  const all = await loadLeadsWithContacts(supabase, auth.userId);
  const idSet = new Set(ids);
  const targets = all.filter((l) => idSet.has(l.id));
  const updatedRows: LeadRow[] = [];

  for (const lead of targets) {
    const score = fitScore(lead);
    const { data } = await supabase
      .from("leads")
      .update({ score, updated_at: new Date().toISOString() })
      .eq("id", lead.id)
      .eq("user_id", auth.userId)
      .select()
      .single();
    if (data) updatedRows.push(data as LeadRow);
  }

  const refreshed = await loadLeadsWithContacts(supabase, auth.userId);
  return NextResponse.json(refreshed.filter((l) => idSet.has(l.id)));
}
