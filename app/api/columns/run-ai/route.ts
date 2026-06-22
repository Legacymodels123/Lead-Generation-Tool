import { NextRequest, NextResponse } from "next/server";
import { generateCustomAiValue } from "@/lib/automation/claude";
import { runWithWorkspaceAi } from "@/lib/automation/ai-context";
import { getAiConfigAsync } from "@/lib/automation/provider";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import { loadLeadsWithContacts, updateLeadInDb } from "@/lib/data/leads-db";
import { fetchCustomColumns } from "@/lib/db/custom-columns";
import { shouldRunAiForLead } from "@/lib/column-conditions";
import { getLead, getLeads, updateLead } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = auth.workspaceId;

  return runWithWorkspaceAi(workspaceId, async () => {
    const { apiKey } = await getAiConfigAsync();
    if (!apiKey) {
      return NextResponse.json(
        { error: "No AI provider configured. Add a key under Integrations." },
        { status: 503 }
      );
    }

    const body = (await req.json()) as { columnId: string; leadIds: string[] };
    const { columnId, leadIds } = body;
    if (!columnId || !leadIds?.length) {
      return NextResponse.json({ error: "Missing columnId or leadIds" }, { status: 400 });
    }

    const columns = await fetchCustomColumns(workspaceId);
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.type !== "ai_enriched" || !column.aiPrompt) {
      return NextResponse.json({ error: "Invalid AI column" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const useCloud = isCloudEnabled() && supabase;
    const cloudLeads = useCloud
      ? await loadLeadsWithContacts(supabase, auth.userId)
      : null;

    const updated: string[] = [];
    for (const leadId of leadIds) {
      const lead =
        cloudLeads?.find((l) => l.id === leadId) ??
        getLead(leadId) ??
        getLeads(workspaceId).find((l) => l.id === leadId);
      if (!lead) continue;
      if (!shouldRunAiForLead(column, lead)) continue;

      try {
        const value = await generateCustomAiValue(column.aiPrompt, lead);
        const patch = {
          customValues: { ...(lead.customValues ?? {}), [column.key]: value },
        };

        if (useCloud) {
          const saved = await updateLeadInDb(supabase, auth.userId, leadId, patch);
          if (saved) updated.push(leadId);
        } else {
          updateLead(leadId, patch);
          updated.push(leadId);
        }
      } catch (err) {
        console.error("AI column run failed:", err);
      }
    }

    return NextResponse.json({ updated: updated.length, leadIds: updated });
  });
}
