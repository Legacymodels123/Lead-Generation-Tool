import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import { loadLeadsWithContacts, updateLeadInDb } from "@/lib/data/leads-db";
import { formatResearchResult, researchWebsite } from "@/lib/research/website";
import { getLead, updateLead } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, websiteUrl, outputColumnKey, prompt, leads: bodyLeads } = body as {
    leadId: string;
    websiteUrl?: string;
    outputColumnKey?: string;
    prompt?: string;
    leads?: Lead[];
  };

  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let lead: Lead | undefined;

  if (isCloudEnabled() && supabase) {
    const all = await loadLeadsWithContacts(supabase, auth.userId, auth.workspaceId);
    lead = all.find((l) => l.id === leadId);
  } else {
    lead = getLead(leadId);
  }

  if (!lead && bodyLeads?.length) {
    lead = bodyLeads.find((l) => l.id === leadId);
  }

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const result = await researchWebsite(lead, websiteUrl, prompt);
    const formatted = formatResearchResult(result);
    const columnKey = outputColumnKey || "website_research";

    const patch: Partial<Lead> = {
      aiStatus: "done",
      customValues: {
        ...(lead.customValues ?? {}),
        [columnKey]: formatted,
      },
      aiSummary: lead.aiSummary || result.summary,
      sector: lead.sector || result.industry || lead.sector,
    };

    let updated: Lead;
    if (isCloudEnabled() && supabase) {
      const dbUpdated = await updateLeadInDb(supabase, auth.userId, leadId, patch);
      if (!dbUpdated) {
        return NextResponse.json({ error: "Failed to save research" }, { status: 500 });
      }
      updated = dbUpdated;
    } else {
      const memUpdated = updateLead(leadId, patch);
      if (!memUpdated) {
        return NextResponse.json({ error: "Failed to save research" }, { status: 500 });
      }
      updated = memUpdated;
    }

    return NextResponse.json({ lead: updated, research: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Research failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
