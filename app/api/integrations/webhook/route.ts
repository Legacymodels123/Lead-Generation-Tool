import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhook, type WebhookEvent } from "@/lib/integrations/webhooks";

const VALID_EVENTS = new Set<string>([
  "lead.created",
  "lead.status_changed",
  "batch.imported",
  "automation.completed",
]);

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    event: string;
    data: Record<string, unknown>;
    webhookUrl?: string;
  };

  if (!VALID_EVENTS.has(body.event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  let webhookUrl = body.webhookUrl;
  if (!webhookUrl) {
    const supabase = createAdminClient();
    if (supabase) {
      const { data } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", auth.userId)
        .maybeSingle();
      webhookUrl = (data?.settings as { webhookUrl?: string })?.webhookUrl;
    }
  }

  if (!webhookUrl) {
    return NextResponse.json({ skipped: true, reason: "No webhook URL" });
  }

  const result = await dispatchWebhook(webhookUrl, {
    event: body.event as WebhookEvent,
    userId: auth.userId,
    timestamp: new Date().toISOString(),
    data: body.data,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Webhook failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
