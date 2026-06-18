import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import { loadLeadsWithContacts, updateLeadInDb } from "@/lib/data/leads-db";
import { getIntegrationToken } from "@/lib/integrations/credentials";
import { isHubSpotConfigured } from "@/lib/hubspot/client";
import {
  loadColumnMappings,
  syncLeadsToHubSpotWithToken,
} from "@/lib/hubspot/field-mapping";
import { HubSpotClient } from "@/lib/hubspot/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { normalizeLead } from "@/lib/utils/contacts";
import { generateId } from "@/lib/utils";
import { getLead } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hubspotToken = await getIntegrationToken(auth.workspaceId, auth.userId, "hubspot");
  if (!isHubSpotConfigured(hubspotToken)) {
    return NextResponse.json(
      { error: "HubSpot niet geconfigureerd. Voeg token toe via Integrations." },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    leadIds: string[];
    leads?: Lead[];
    includeTimelineNote?: boolean;
  };
  const { leadIds, includeTimelineNote } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let targets: Lead[] = [];

  if (isCloudEnabled() && supabase) {
    const all = await loadLeadsWithContacts(supabase, auth.userId);
    const idSet = new Set(leadIds);
    targets = all.filter((l) => idSet.has(l.id));
  } else if (body.leads?.length) {
    const idSet = new Set(leadIds);
    targets = body.leads.filter((l) => idSet.has(l.id)).map((l) => normalizeLead(l));
  } else {
    targets = leadIds
      .map((id) => getLead(id))
      .filter((l): l is Lead => Boolean(l));
  }

  if (!targets.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const mappings = await loadColumnMappings(auth.workspaceId);
  const syncResults = await syncLeadsToHubSpotWithToken(targets, hubspotToken!, mappings);
  const updated: Lead[] = [];

  for (const item of syncResults) {
    if (item.error || !item.lead) {
      if (supabase && item.error) {
        const lead = targets.find((l) => l.id === item.leadId);
        if (lead) {
          await supabase.from("hubspot_sync_log").insert({
            id: generateId(),
            user_id: auth.userId,
            account_id: lead.id,
            status: "error",
            error: item.error,
          });
        }
      }
      continue;
    }

    const synced = item.lead;
    updated.push(synced);

    if (includeTimelineNote && synced.aiSummary && synced.hubspotCompanyId) {
      try {
        const client = new HubSpotClient(hubspotToken!);
        const noteBody = [
          synced.aiSummary,
          synced.fitReason ? `\n\nFit: ${synced.fitReason}` : "",
          synced.score != null ? `\n\nICP score: ${synced.score}%` : "",
        ].join("");
        await client.createCompanyNote(synced.hubspotCompanyId, noteBody);
      } catch {
        /* optional */
      }
    }

    if (isCloudEnabled() && supabase) {
      await updateLeadInDb(supabase, auth.userId, synced.id, {
        hubspotCompanyId: synced.hubspotCompanyId,
        contacts: synced.contacts,
      });
      await supabase.from("hubspot_sync_log").insert({
        id: generateId(),
        user_id: auth.userId,
        account_id: synced.id,
        hubspot_company_id: synced.hubspotCompanyId,
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
  return NextResponse.json({
    configured: isHubSpotConfigured(process.env.HUBSPOT_ACCESS_TOKEN),
  });
}
