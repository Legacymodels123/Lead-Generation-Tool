import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import {
  loadLeadsWithContacts,
  updateLeadInDb,
} from "@/lib/data/leads-db";
import { buildAccountWaterfall, buildEnrichmentWaterfall } from "@/lib/enrichment/waterfall";
import { runWithWorkspaceAi } from "@/lib/automation/ai-context";
import { getAiConfigAsync } from "@/lib/automation/provider";
import { getLead, updateLead } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { fitScore } from "@/lib/utils";
import { normalizeLead } from "@/lib/utils/contacts";

export const dynamic = "force-dynamic";

interface EnrichRequest {
  leadId: string;
  leads?: Lead[];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: EnrichRequest = await request.json();
    if (!body.leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    return runWithWorkspaceAi(auth.workspaceId, async () => {
    const { apiKey } = await getAiConfigAsync();
    const accountWaterfall = buildAccountWaterfall(Boolean(apiKey));
    const contactWaterfall = buildEnrichmentWaterfall(Boolean(apiKey));

    let lead: Lead | undefined;
    const supabase = createAdminClient();

    if (isCloudEnabled() && supabase) {
      const all = await loadLeadsWithContacts(supabase, auth.userId);
      lead = all.find((l) => l.id === body.leadId);
    } else {
      lead = getLead(body.leadId);
      if (lead && lead.workspaceId !== auth.workspaceId) lead = undefined;
    }

    if (!lead && body.leads?.length) {
      lead = body.leads.find((l) => l.id === body.leadId);
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const patch: Partial<Lead> = { aiStatus: "done" };

    if (accountWaterfall) {
      try {
        const accountResult = await accountWaterfall.enrichAccount(lead);
        Object.assign(patch, {
          market: accountResult.market || lead.market,
          sector: accountResult.sector || lead.sector,
          fitReason: accountResult.fitReason || lead.fitReason,
          employees: accountResult.employees ?? lead.employees,
          revenue: accountResult.revenue || lead.revenue,
          country: accountResult.country || lead.country,
          website: accountResult.website || lead.website,
          linkedinCompanyUrl: accountResult.linkedinCompanyUrl || lead.linkedinCompanyUrl,
          aiSummary: accountResult.aiSummary || lead.aiSummary,
        });
      } catch (e) {
        console.error("Account enrichment failed:", e);
      }
    }

    const workingLead = normalizeLead({ ...lead, ...patch });
    const enrichedContacts = [...workingLead.contacts];

    if (contactWaterfall) {
      for (let i = 0; i < enrichedContacts.length; i++) {
        const contact = enrichedContacts[i];
        if (!contact.name && !contact.linkedinUrl) continue;
        try {
          const result = await contactWaterfall.enrichContact(contact, workingLead);
          enrichedContacts[i] = {
            ...contact,
            email: result.email || contact.email,
            phone: result.phone || contact.phone,
            name: result.name || contact.name,
            title: result.title || contact.title,
            linkedinUrl: result.linkedinUrl || contact.linkedinUrl,
            enrichmentStatus: "done",
            emailConfidence: result.emailConfidence,
            enrichmentProvider: result.enrichmentProvider,
          };
        } catch {
          enrichedContacts[i] = { ...contact, enrichmentStatus: "error" };
        }
      }
    }

    patch.contacts = enrichedContacts;
    patch.score = fitScore(workingLead);

    let updatedLead: Lead;
    if (isCloudEnabled() && supabase) {
      const updated = await updateLeadInDb(supabase, auth.userId, body.leadId, patch);
      if (!updated) {
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
      }
      updatedLead = updated;
    } else {
      const updated = updateLead(body.leadId, patch);
      if (!updated) {
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
      }
      updatedLead = updated;
    }

    return NextResponse.json({
      lead: updatedLead,
      enrichment: { source: accountWaterfall ? "waterfall" : "none" },
    });
    });
  } catch (error) {
    console.error("Enrich lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
