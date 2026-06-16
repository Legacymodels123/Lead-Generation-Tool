import { NextRequest, NextResponse } from "next/server";
import { generateAiColumn } from "@/lib/automation/claude";
import { getAiConfig } from "@/lib/automation/provider";
import { leadToRow, rowToLead, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import {
  AI_COLUMNS,
  DEFAULT_AI_COLUMNS,
  type AiColumnKey,
} from "@/lib/types/automation";

const VALID_COLUMNS = new Set<AiColumnKey>(DEFAULT_AI_COLUMNS);

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const { apiKey, provider } = getAiConfig();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Geen AI provider geconfigureerd. Voeg OPENAI_API_KEY of ANTHROPIC_API_KEY toe in .env.local of Vercel.",
      },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    leadIds: string[];
    columns?: AiColumnKey[];
    leads?: Lead[];
  };

  const { leadIds } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const columns = (body.columns ?? DEFAULT_AI_COLUMNS).filter((c) =>
    VALID_COLUMNS.has(c)
  );
  if (!columns.length) {
    return NextResponse.json({ error: "Geen geldige kolommen" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let leads: Lead[] = [];

  if (supabase) {
    const { data: rows, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .in("id", leadIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    leads = ((rows as LeadRow[]) ?? []).map((row) => rowToLead(row));
  }

  if (!leads.length && body.leads?.length) {
    const idSet = new Set(leadIds);
    leads = body.leads.filter((l) => idSet.has(l.id));
  } else if (!leads.length) {
    return NextResponse.json(
      { error: "Cloud storage not configured — stuur leads mee voor lokaal gebruik" },
      { status: 503 }
    );
  }

  if (!leads.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const updated: Lead[] = [];

  for (const lead of leads) {
    const patch: Partial<Lead> = {};

    try {
      for (const column of columns) {
        patch[column] = await generateAiColumn(column, lead);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generatie mislukt";
      return NextResponse.json({ error: msg, partial: updated }, { status: 502 });
    }

    const merged = { ...lead, ...patch };

    if (supabase) {
      const dbPatch: Record<string, string> = {};
      for (const col of AI_COLUMNS) {
        if (col.key in patch) {
          dbPatch[col.dbField] = merged[col.key] ?? "";
        }
      }

      const { data, error } = await supabase
        .from("leads")
        .update({ ...dbPatch, updated_at: new Date().toISOString() })
        .eq("id", lead.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        const hint = error.message.includes("ai_")
          ? `${error.message} — Run de SQL migratie in supabase/schema.sql`
          : error.message;
        return NextResponse.json({ error: hint }, { status: 500 });
      }
      updated.push(rowToLead(data as LeadRow));
    } else {
      updated.push(merged);
    }
  }

  return NextResponse.json(updated);
}
