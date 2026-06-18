import { NextRequest, NextResponse } from "next/server";
import { loadLeadsWithContacts } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";

async function enrichUser(
  req: NextRequest,
  userId: string
): Promise<{ processed: number; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { processed: 0, error: "Cloud not configured" };

  const leads = await loadLeadsWithContacts(supabase, userId);
  const pending = leads.filter(
    (l) => !l.market || !l.fitReason || l.contacts.some((c) => c.enrichmentStatus === "idle")
  );

  if (!pending.length) return { processed: 0 };

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
    return {
      processed: 0,
      error: (err as { error?: string }).error ?? "Enrichment failed",
    };
  }

  const result = await enrichRes.json();
  return { processed: (result as { leads?: unknown[] }).leads?.length ?? 0 };
}

async function runNightlyEnrichment(req: NextRequest, body: { userIds?: string[] }) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud not configured" }, { status: 503 });
  }

  let userIds = body.userIds ?? [];
  if (!userIds.length) {
    const envIds = process.env.NIGHTLY_USER_IDS?.split(",").map((s) => s.trim()).filter(Boolean);
    if (envIds?.length) {
      userIds = envIds;
    } else {
      const { data } = await supabase.from("user_settings").select("user_id, settings");
      userIds =
        data
          ?.filter((row) => (row.settings as { nightlyAgent?: boolean })?.nightlyAgent)
          .map((row) => row.user_id) ?? [];
      if (!userIds.length) userIds = ["demo-user"];
    }
  }

  const results: Array<{ userId: string; processed: number; error?: string }> = [];
  for (const userId of userIds) {
    results.push({ userId, ...(await enrichUser(req, userId)) });
  }

  const total = results.reduce((n, r) => n + r.processed, 0);
  return NextResponse.json({
    message: "Nightly enrichment complete",
    processed: total,
    results,
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNightlyEnrichment(req, {});
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { userIds?: string[] };
  return runNightlyEnrichment(req, body);
}
