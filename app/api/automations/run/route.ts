import { NextRequest, NextResponse } from "next/server";
import { generateCustomAiColumn } from "@/lib/automation/custom-column";
import { generateAiColumn } from "@/lib/automation/claude";
import { getAiConfig } from "@/lib/automation/provider";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import {
  loadLeadsWithContacts,
  rowToLead,
  updateLeadInDb,
  type LeadRow,
} from "@/lib/data/leads-db";
import { getLead, updateLead } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import {
  AI_COLUMNS,
  DEFAULT_AI_COLUMNS,
  type AiColumnKey,
} from "@/lib/types/automation";

const VALID_COLUMNS = new Set<AiColumnKey>(DEFAULT_AI_COLUMNS);

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey } = getAiConfig();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Geen AI provider geconfigureerd. Voeg OPENAI_API_KEY of ANTHROPIC_API_KEY toe in Integrations of .env.local.",
      },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    leadIds: string[];
    columns?: AiColumnKey[];
    customColumnKey?: string;
    prompt?: string;
    leads?: Lead[];
  };

  const { leadIds, customColumnKey, prompt } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const columns = (body.columns ?? DEFAULT_AI_COLUMNS).filter((c) => VALID_COLUMNS.has(c));
  const isCustomRun = Boolean(customColumnKey && prompt);

  if (!columns.length && !isCustomRun) {
    return NextResponse.json({ error: "Geen geldige kolommen" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let leads: Lead[] = [];

  if (isCloudEnabled() && supabase) {
    const all = await loadLeadsWithContacts(supabase, auth.userId);
    const idSet = new Set(leadIds);
    leads = all.filter((l) => idSet.has(l.id));
  }

  if (!leads.length && body.leads?.length) {
    const idSet = new Set(leadIds);
    leads = body.leads.filter((l) => idSet.has(l.id));
  } else if (!leads.length && !isCloudEnabled()) {
    leads = leadIds
      .map((id) => getLead(id))
      .filter((l): l is Lead => Boolean(l));
  }

  if (!leads.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const updated: Lead[] = [];

  for (const lead of leads) {
    const patch: Partial<Lead> = { aiStatus: "done" };

    try {
      if (isCustomRun && customColumnKey && prompt) {
        const value = await generateCustomAiColumn(lead, prompt);
        patch.customValues = {
          ...(lead.customValues ?? {}),
          [customColumnKey]: value,
        };
      } else {
        for (const column of columns) {
          patch[column] = await generateAiColumn(column, lead);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generatie mislukt";
      return NextResponse.json({ error: msg, partial: updated }, { status: 502 });
    }

    const merged = { ...lead, ...patch };

    if (isCloudEnabled() && supabase) {
      const saved = await updateLeadInDb(supabase, auth.userId, lead.id, patch);
      updated.push(saved ?? merged);
    } else {
      const saved = updateLead(lead.id, patch);
      updated.push(saved ?? merged);
    }
  }

  return NextResponse.json(updated);
}
