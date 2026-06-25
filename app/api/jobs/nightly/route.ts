import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { enrichLeadForWorkspace } from "@/lib/enrichment/enrich-lead-server";
import { loadLeadsWithContacts } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";

async function enrichUser(userId: string): Promise<{ processed: number; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { processed: 0, error: "Cloud not configured" };

  const leads = await loadLeadsWithContacts(supabase, userId);
  const pending = leads.filter(
    (l) => !l.market || !l.fitReason || l.contacts.some((c) => c.enrichmentStatus === "idle")
  );

  if (!pending.length) return { processed: 0 };

  let processed = 0;
  for (const lead of pending.slice(0, 10)) {
    const workspaceId = lead.workspaceId ?? DEFAULT_WORKSPACE_ID;
    const result = await enrichLeadForWorkspace(userId, workspaceId, lead.id);
    if (result.lead) processed += 1;
    else if (result.error && processed === 0) {
      return { processed: 0, error: result.error };
    }
  }

  return { processed };
}

async function runNightlyEnrichment(body: { userIds?: string[] }) {
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
    results.push({ userId, ...(await enrichUser(userId)) });
  }

  const total = results.reduce((n, r) => n + r.processed, 0);
  return NextResponse.json({
    message: "Nightly enrichment complete",
    processed: total,
    results,
  });
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNightlyEnrichment({});
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { userIds?: string[] };
  return runNightlyEnrichment(body);
}
