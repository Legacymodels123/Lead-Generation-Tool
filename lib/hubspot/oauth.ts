import { getWorkspaceConfigForApi, saveWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";

interface HubSpotOAuthEntry {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  connectedAt?: string;
}

function getHubSpotOAuthEntry(oauth: Record<string, unknown> | undefined): HubSpotOAuthEntry | undefined {
  return (oauth?.hubspot_oauth ?? oauth?.hubspot) as HubSpotOAuthEntry | undefined;
}

export function isHubSpotTokenExpired(entry: HubSpotOAuthEntry | undefined): boolean {
  if (!entry?.expiresAt) return false;
  return Date.now() > entry.expiresAt - 60_000;
}

export async function refreshHubSpotAccessToken(
  workspaceId: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

/** Return a valid HubSpot access token, refreshing via OAuth refresh_token when needed. */
export async function getValidHubSpotToken(workspaceId: string): Promise<string | null> {
  const config = await getWorkspaceConfigForApi(workspaceId);
  const apiKey = config.apiKeys?.hubspot;
  if (typeof apiKey === "string" && apiKey.trim() && !apiKey.includes("•")) {
    return apiKey.trim();
  }

  const oauth = config.oauth as Record<string, unknown> | undefined;
  const entry = getHubSpotOAuthEntry(oauth);
  if (!entry?.accessToken) return null;

  if (!isHubSpotTokenExpired(entry)) {
    return entry.accessToken;
  }

  if (!entry.refreshToken) return entry.accessToken;

  const refreshed = await refreshHubSpotAccessToken(workspaceId, entry.refreshToken);
  if (!refreshed) return entry.accessToken;

  await saveWorkspaceConfigForApi(workspaceId, {
    apiKeys: { hubspot: refreshed.accessToken },
    oauth: {
      ...(oauth ?? {}),
      hubspot_oauth: {
        ...entry,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        connectedAt: entry.connectedAt ?? new Date().toISOString(),
      },
    },
  });

  return refreshed.accessToken;
}
