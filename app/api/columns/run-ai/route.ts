import { NextRequest, NextResponse } from "next/server";
import { generateCustomAiValue } from "@/lib/automation/claude";
import { runWithWorkspaceAi } from "@/lib/automation/ai-context";
import { getAiConfigAsync } from "@/lib/automation/provider";
import { fetchCustomColumns } from "@/lib/db/custom-columns";
import { shouldRunAiForLead } from "@/lib/column-conditions";
import { getLead, getLeads, updateLead } from "@/lib/server/store";
import { getSessionUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = token ? getSessionUser(token) : null;
  if (!user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = user.workspaceId;

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

  const updated: string[] = [];
  for (const leadId of leadIds) {
    const lead = getLead(leadId) ?? getLeads(workspaceId).find((l) => l.id === leadId);
    if (!lead) continue;
    if (!shouldRunAiForLead(column, lead)) continue;

    try {
      const value = await generateCustomAiValue(column.aiPrompt, lead);
      updateLead(leadId, {
        customValues: { ...(lead.customValues ?? {}), [column.key]: value },
      });
      updated.push(leadId);
    } catch (err) {
      console.error("AI column run failed:", err);
    }
  }

  return NextResponse.json({ updated: updated.length, leadIds: updated });
  });
}
