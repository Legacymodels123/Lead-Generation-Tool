import type { IntegrationProvider } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import { isMaskedSecret } from "@/lib/integrations/status";
import { getWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";
import {
  getConnectionMemory,
  listConnectionsMemory,
  saveConnectionMemory,
  deleteConnectionMemory,
} from "@/lib/server/integrations-store";

const ENV_MAP: Partial<Record<IntegrationProvider, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  hubspot: "HUBSPOT_ACCESS_TOKEN",
  hunter: "HUNTER_API_KEY",
  apollo: "APOLLO_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
  instantly: "INSTANTLY_API_KEY",
};

const WORKSPACE_KEY_PROVIDERS = new Set<string>([
  "openai",
  "anthropic",
  "hubspot",
  "hunter",
  "apollo",
  "instantly",
  "linkedin",
]);

type OAuthStore = Record<string, { accessToken?: string }>;

async function tokenFromWorkspaceConfig(
  workspaceId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const config = await getWorkspaceConfigForApi(workspaceId);
  const apiKey = config.apiKeys?.[provider as keyof typeof config.apiKeys];
  if (typeof apiKey === "string" && apiKey.trim() && !isMaskedSecret(apiKey)) {
    return apiKey.trim();
  }

  const oauth = config.oauth as OAuthStore | undefined;
  if (provider === "hubspot") {
    return oauth?.hubspot_oauth?.accessToken ?? oauth?.hubspot?.accessToken ?? null;
  }
  if (provider === "linkedin") {
    return oauth?.linkedin?.accessToken ?? null;
  }

  return null;
}

export async function getIntegrationToken(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  if (WORKSPACE_KEY_PROVIDERS.has(provider)) {
    const fromWorkspace = await tokenFromWorkspaceConfig(workspaceId, provider);
    if (fromWorkspace) return fromWorkspace;
  }

  const mem = getConnectionMemory(workspaceId, userId, provider);
  if (mem?.accessToken) return mem.accessToken;

  if (isCloudEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { data } = await supabase
        .from("integration_connections")
        .select("access_token, status")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("provider", provider)
        .eq("status", "connected")
        .maybeSingle();

      if (data?.access_token) return data.access_token as string;
    }
  }

  const envKey = ENV_MAP[provider];
  if (envKey && process.env[envKey]) return process.env[envKey]!;

  return null;
}

export async function listIntegrationConnections(
  workspaceId: string,
  userId: string
): Promise<Array<{ provider: IntegrationProvider; status: string; updatedAt?: string }>> {
  const results: Array<{ provider: IntegrationProvider; status: string; updatedAt?: string }> = [];

  if (isCloudEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { data } = await supabase
        .from("integration_connections")
        .select("provider, status, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      for (const row of data ?? []) {
        results.push({
          provider: row.provider as IntegrationProvider,
          status: row.status as string,
          updatedAt: row.updated_at as string,
        });
      }
    }
  }

  for (const conn of listConnectionsMemory(workspaceId, userId)) {
    if (!results.some((r) => r.provider === conn.provider)) {
      results.push({
        provider: conn.provider,
        status: conn.status,
        updatedAt: conn.updatedAt,
      });
    }
  }

  for (const [provider, envKey] of Object.entries(ENV_MAP)) {
    if (process.env[envKey!] && !results.some((r) => r.provider === provider)) {
      results.push({ provider: provider as IntegrationProvider, status: "connected" });
    }
  }

  return results;
}

/** Keep integration_connections in sync when keys are saved via Integrations UI */
export async function syncWorkspaceKeysToConnections(
  workspaceId: string,
  userId: string,
  apiKeys: NonNullable<Awaited<ReturnType<typeof getWorkspaceConfigForApi>>["apiKeys"]>
): Promise<void> {
  const providers = ["hubspot", "hunter", "apollo", "linkedin", "instantly"] as const;
  for (const provider of providers) {
    const token = apiKeys[provider as keyof typeof apiKeys];
    if (typeof token === "string" && token.trim() && !isMaskedSecret(token)) {
      await saveIntegrationConnection(workspaceId, userId, provider, token.trim());
    }
  }
}

export async function saveIntegrationConnection(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider,
  accessToken: string
): Promise<void> {
  saveConnectionMemory(workspaceId, userId, provider, accessToken);

  if (isCloudEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      const now = new Date().toISOString();
      const { error } = await supabase.from("integration_connections").upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          provider,
          access_token: accessToken,
          status: "connected",
          updated_at: now,
        },
        { onConflict: "workspace_id,user_id,provider" }
      );
      if (error) {
        console.warn(`integration_connections upsert (${provider}):`, error.message);
      }
    }
  }
}

export async function deleteIntegrationConnection(
  workspaceId: string,
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  deleteConnectionMemory(workspaceId, userId, provider);

  if (isCloudEnabled()) {
    const supabase = createAdminClient();
    if (supabase) {
      await supabase
        .from("integration_connections")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("provider", provider);
    }
  }
}
