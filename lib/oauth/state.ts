import { createHmac, timingSafeEqual } from "crypto";

export interface OAuthStatePayload {
  provider: string;
  workspaceId: string;
  userId?: string;
  redirectTo?: string;
  timestamp: number;
}

function stateSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-oauth-state-secret"
  );
}

export function signOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  const sig = createHmac("sha256", stateSecret()).update(json).digest("base64url");
  const body = Buffer.from(json, "utf-8").toString("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const dot = state.indexOf(".");
  if (dot <= 0) return null;

  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  if (!body || !sig) return null;

  try {
    const json = Buffer.from(body, "base64url").toString("utf-8");
    const expected = createHmac("sha256", stateSecret()).update(json).digest("base64url");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    return JSON.parse(json) as OAuthStatePayload;
  } catch {
    return null;
  }
}
