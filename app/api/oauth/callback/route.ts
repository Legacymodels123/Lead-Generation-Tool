import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import type { OAuthToken } from "@/lib/oauth/types";
import {
  ensureWorkspaceRow,
  getWorkspaceConfigForApi,
  saveWorkspaceConfigForApi,
} from "@/lib/server/workspace-config-api";
import { saveIntegrationConnection } from "@/lib/integrations/credentials";
import type { IntegrationProvider } from "@/lib/types";

import { verifyOAuthState } from "@/lib/oauth/state";
async function exchangeCodeForToken(
  provider: string,
  code: string,
  redirectUri: string
): Promise<OAuthToken | null> {
  const clientId =
    provider === "linkedin"
      ? process.env.LINKEDIN_CLIENT_ID
      : provider === "hubspot_oauth"
        ? process.env.HUBSPOT_CLIENT_ID
        : null;

  const clientSecret =
    provider === "linkedin"
      ? process.env.LINKEDIN_CLIENT_SECRET
      : provider === "hubspot_oauth"
        ? process.env.HUBSPOT_CLIENT_SECRET
        : null;

  if (!clientId || !clientSecret) {
    console.error(`Missing OAuth credentials for ${provider}`);
    return null;
  }

  const tokenUrl =
    provider === "linkedin"
      ? "https://www.linkedin.com/oauth/v2/accessToken"
      : "https://api.hubapi.com/oauth/v1/token";

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      console.error(`Token exchange failed: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    return {
      provider,
      accessToken: data.access_token || "",
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      scope: data.scope,
      tokenType: data.token_type,
    };
  } catch (err) {
    console.error("Token exchange error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const returnUrl = new URL("/integrations?error=oauth_failed", request.url);
    returnUrl.searchParams.set("error_detail", errorDescription || error);
    return NextResponse.redirect(returnUrl);
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/integrations?error=missing_code", request.url));
  }

  const stateData = verifyOAuthState(state);
  if (!stateData) {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", request.url));
  }

  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(new URL("/integrations?error=state_expired", request.url));
  }

  const { provider, workspaceId, redirectTo, userId } = stateData;
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`;

  const token = await exchangeCodeForToken(provider, code, redirectUri);
  if (!token) {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange_failed", request.url)
    );
  }

  try {
    await ensureWorkspaceRow(workspaceId);
    const currentConfig = await getWorkspaceConfigForApi(workspaceId);
    const providerKey = provider === "hubspot_oauth" ? "hubspot" : provider;

    await saveWorkspaceConfigForApi(workspaceId, {
      apiKeys:
        providerKey === "hubspot" || providerKey === "linkedin"
          ? {
              ...(currentConfig.apiKeys ?? {}),
              [providerKey]: token.accessToken,
            }
          : currentConfig.apiKeys,
      oauth: {
        ...(currentConfig.oauth as object),
        [provider]: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          scope: token.scope,
          tokenType: token.tokenType,
          connectedAt: new Date().toISOString(),
        },
      },
    });

    if (userId && (providerKey === "hubspot" || providerKey === "linkedin")) {
      await saveIntegrationConnection(
        workspaceId,
        userId,
        providerKey as IntegrationProvider,
        token.accessToken
      );
    }
  } catch (err) {
    console.error("OAuth config save failed:", err);
    return NextResponse.redirect(
      new URL("/integrations?error=config_save_failed", request.url)
    );
  }

  const returnUrl = new URL(redirectTo || "/integrations", request.url);
  const displayName = provider === "hubspot_oauth" ? "HubSpot" : provider === "linkedin" ? "LinkedIn" : provider;
  returnUrl.searchParams.set("oauth_success", displayName);
  return NextResponse.redirect(returnUrl);
}
