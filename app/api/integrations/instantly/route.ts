import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { addLeadsToInstantlyCampaign } from "@/lib/integrations/instantly";
import { getIntegrationToken } from "@/lib/integrations/credentials";
import { loadLeadsWithContacts } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { normalizeLead } from "@/lib/utils/contacts";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    leadIds: string[];
    campaignId: string;
    leads?: Lead[];
  };

  const { leadIds, campaignId } = body;
  if (!leadIds?.length || !campaignId) {
    return NextResponse.json({ error: "leadIds en campaignId vereist" }, { status: 400 });
  }

  const apiKey = await getIntegrationToken(auth.workspaceId, auth.userId, "instantly");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Instantly API key niet geconfigureerd — voeg toe onder Integrations" },
      { status: 503 }
    );
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

  const instantlyLeads = targets.flatMap((lead) =>
    lead.contacts
      .filter((c) => c.email)
      .map((c) => {
        const parts = c.name.trim().split(/\s+/);
        return {
          email: c.email,
          first_name: parts[0] ?? "",
          last_name: parts.slice(1).join(" "),
          company_name: lead.company,
          personalization: lead.aiMessage ?? lead.message ?? "",
        };
      })
  );

  if (!instantlyLeads.length) {
    return NextResponse.json({ error: "Geen contacten met e-mail" }, { status: 400 });
  }

  const result = await addLeadsToInstantlyCampaign(apiKey, campaignId, instantlyLeads);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuth(req);
  const workspaceId = auth?.workspaceId ?? "legacy-scale-models";
  const userId = auth?.userId ?? "demo-user-001";
  const apiKey = await getIntegrationToken(workspaceId, userId, "instantly");
  return NextResponse.json({ configured: Boolean(apiKey) });
}
