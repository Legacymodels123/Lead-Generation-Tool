import { isCloudDataEnabled } from "@/lib/data/is-cloud";
import { loadLeadsWithContacts, updateLeadInDb } from "@/lib/data/leads-db";
import { buildAccountWaterfall, buildEnrichmentWaterfall } from "@/lib/enrichment/waterfall";
import { runWithWorkspaceAi } from "@/lib/automation/ai-context";
import { getAiConfigAsync } from "@/lib/automation/provider";
import { getLead, updateLead } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { fitScore } from "@/lib/utils";
import { normalizeLead } from "@/lib/utils/contacts";

export async function enrichLeadForWorkspace(
  userId: string,
  workspaceId: string,
  leadId: string
): Promise<{ lead?: Lead; error?: string }> {
  return runWithWorkspaceAi(workspaceId, async () => {
    const { apiKey } = await getAiConfigAsync();
    const accountWaterfall = buildAccountWaterfall(Boolean(apiKey));
    const contactWaterfall = buildEnrichmentWaterfall(Boolean(apiKey));

    let lead: Lead | undefined;
    const supabase = createAdminClient();

    if (isCloudDataEnabled() && supabase) {
      const all = await loadLeadsWithContacts(supabase, userId, workspaceId);
      lead = all.find((l) => l.id === leadId);
    } else {
      lead = getLead(leadId);
      if (lead && lead.workspaceId !== workspaceId) lead = undefined;
    }

    if (!lead) {
      return { error: "Lead not found" };
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

    if (isCloudDataEnabled() && supabase) {
      const updated = await updateLeadInDb(supabase, userId, leadId, patch);
      if (!updated) return { error: "Failed to update lead" };
      return { lead: updated };
    }

    const updated = updateLead(leadId, patch);
    if (!updated) return { error: "Failed to update lead" };
    return { lead: updated };
  });
}
