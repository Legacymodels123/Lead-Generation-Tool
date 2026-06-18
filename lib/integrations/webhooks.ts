export type WebhookEvent =
  | "lead.created"
  | "lead.status_changed"
  | "batch.imported"
  | "automation.completed";

export interface WebhookPayload {
  event: WebhookEvent;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(
  url: string,
  payload: WebhookPayload
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!url?.trim()) return { ok: false, error: "No webhook URL" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Webhook failed" };
  }
}
