import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { loadLeadsWithContacts } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHubSpotConfigured } from "@/lib/hubspot/client";
import { getAiConfig } from "@/lib/automation/provider";

export async function GET() {
  const { apiKey, provider } = getAiConfig();
  const supabase = createAdminClient();

  return NextResponse.json({
    cloud: Boolean(supabase),
    ai: Boolean(apiKey),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    aiProvider: provider,
    supabasePublic: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    hubspot: isHubSpotConfigured(),
    supabaseAuth: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  });
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId ?? "demo-user";

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud not configured" }, { status: 503 });
  }

  const leads = await loadLeadsWithContacts(supabase, userId);
  const pending = leads.filter(
    (l) => !l.market || !l.fitReason || l.contacts.some((c) => c.enrichmentStatus === "idle")
  );

  if (!pending.length) {
    return NextResponse.json({ message: "No pending enrichment", processed: 0 });
  }

  const enrichRes = await fetch(
    new URL("/api/leads/enrich", req.url).origin + "/api/leads/enrich",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        leadIds: pending.slice(0, 10).map((l) => l.id),
        enrichContacts: true,
      }),
    }
  );

  if (!enrichRes.ok) {
    const err = await enrichRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: string }).error ?? "Enrichment failed" },
      { status: 502 }
    );
  }

  const result = await enrichRes.json();
  return NextResponse.json({
    message: "Nightly enrichment complete",
    processed: (result as { leads?: unknown[] }).leads?.length ?? 0,
  });
}
