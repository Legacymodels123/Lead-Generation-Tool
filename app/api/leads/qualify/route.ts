import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWithWorkspaceAi } from "@/lib/automation/ai-context";
import { callAi, parseJsonArray } from "@/lib/automation/provider";
import { loadLeadsWithContacts } from "@/lib/data/leads-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { leadIds } = await req.json() as { leadIds: string[] };
    if (!leadIds?.length) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const all = await loadLeadsWithContacts(supabase, auth.userId, auth.workspaceId);
    const leads = all.filter((l) => leadIds.includes(l.id));

    if (!leads.length) {
      return NextResponse.json({ error: "No leads found" }, { status: 404 });
    }

    return runWithWorkspaceAi(auth.workspaceId, async () => {
    const leadsText = leads
      .map(
        (l) =>
          `Company: ${l.company}, Market: ${l.market}, Sector: ${l.sector}, Employees: ${l.employees}, Website: ${l.website}, Fit Reason: ${l.fitReason}`
      )
      .join("\n");

    const response = await callAi(
      "You are a B2B lead qualification expert. For each lead, determine if it should be QUALIFIED (good fit for outreach) or NOT_QUALIFIED (not a good fit). Return JSON array with leadId, status, and brief reason.",
      `Qualify these leads as either "qualified" or "not_qualified":\n\n${leadsText}\n\nReturn: [{leadId: "...", status: "qualified"|"not_qualified", reason: "..."}]`
    );

    const results = parseJsonArray(response);

    // Map results back to lead IDs
    const qualifiedResults = results.map((r: any, idx: number) => ({
      leadId: leads[idx]?.id || r.leadId,
      status: r.status === "qualified" ? "qualified" : "not_qualified",
      reason: r.reason || "",
    }));

    // Update leads in database
    for (const result of qualifiedResults) {
      await supabase
        .from("leads")
        .update({
          status: result.status,
          ai_summary: result.reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", result.leadId)
        .eq("user_id", auth.userId);
    }

    return NextResponse.json({ results: qualifiedResults });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Qualification error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
