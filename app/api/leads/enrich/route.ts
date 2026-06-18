import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { getAiConfig } from "@/lib/automation/provider";
import {
  claudeAccountFallback,
  claudeContactFallback,
} from "@/lib/enrichment/claude-enricher";
import { buildAccountWaterfall, buildEnrichmentWaterfall } from "@/lib/enrichment/waterfall";
import { loadLeadsWithContacts, leadToRow, saveContactsForLead } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact, Lead } from "@/lib/types";
import { normalizeLead, syncPrimaryContactFields } from "@/lib/utils/contacts";
import { fitScore, generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { leadIds: string[]; leads?: Lead[]; enrichContacts?: boolean };
  const { leadIds, enrichContacts = true } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const { apiKey } = getAiConfig();
  const supabase = createAdminClient();
  let targets: Lead[] = [];

  if (supabase) {
    const all = await loadLeadsWithContacts(supabase, auth.userId);
    const idSet = new Set(leadIds);
    targets = all.filter((l) => idSet.has(l.id));
  }

  if (!targets.length && body.leads?.length) {
    const idSet = new Set(leadIds);
    targets = body.leads.filter((l) => idSet.has(l.id)).map((l) => normalizeLead(l));
  }

  if (!targets.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const contactWaterfall = buildEnrichmentWaterfall(Boolean(apiKey));
  const accountWaterfall = buildAccountWaterfall(Boolean(apiKey));
  const updated: Lead[] = [];

  for (const lead of targets) {
    try {
      const accountData = accountWaterfall
        ? await accountWaterfall.enrichAccount(lead)
        : claudeAccountFallback(lead);

      let contacts: Contact[] = lead.contacts.map((c) => {
        const suggested = accountData.suggestedContacts.find((s) => s.dmuRole === c.dmuRole);
        return {
          ...c,
          name: suggested?.name || c.name,
          title: suggested?.title || c.title,
          linkedinUrl: suggested?.linkedinUrl || c.linkedinUrl,
          enrichmentStatus: "running" as const,
        };
      });

      if (enrichContacts) {
        contacts = await Promise.all(
          contacts.map(async (contact) => {
            try {
              const enriched = contactWaterfall
                ? await contactWaterfall.enrichContact(contact, lead)
                : claudeContactFallback(contact, lead);
              return {
                ...contact,
                name: enriched.name || contact.name,
                title: enriched.title || contact.title,
                email: enriched.email,
                phone: enriched.phone,
                linkedinUrl: enriched.linkedinUrl || contact.linkedinUrl,
                emailConfidence: enriched.emailConfidence,
                enrichmentProvider: enriched.enrichmentProvider,
                aiSummary: enriched.aiSummary,
                enrichmentStatus: "done" as const,
              };
            } catch {
              return { ...contact, enrichmentStatus: "error" as const };
            }
          })
        );
      }

      const merged = syncPrimaryContactFields(
        normalizeLead({
          ...lead,
          market: accountData.market,
          sector: accountData.sector,
          fitReason: accountData.fitReason,
          employees: accountData.employees,
          revenue: accountData.revenue,
          country: accountData.country,
          website: accountData.website,
          linkedinCompanyUrl: accountData.linkedinCompanyUrl,
          aiSummary: accountData.aiSummary,
          contacts,
          score: fitScore({
            ...lead,
            market: accountData.market,
            sector: accountData.sector,
            employees: accountData.employees,
            country: accountData.country,
          }),
        })
      );

      if (supabase) {
        await supabase
          .from("leads")
          .update({
            ...leadToRow(merged, auth.userId),
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .eq("user_id", auth.userId);
        await saveContactsForLead(supabase, auth.userId, merged);

        if (apiKey) {
          await supabase.from("enrichment_jobs").insert({
            id: generateId(),
            user_id: auth.userId,
            account_id: lead.id,
            job_type: "account",
            status: "done",
            completed_at: new Date().toISOString(),
          });
        }
      }

      updated.push(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verrijking mislukt";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ leads: updated, aiPowered: Boolean(apiKey) });
}
