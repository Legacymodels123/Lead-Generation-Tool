import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { OAuthToken } from "@/lib/oauth/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StatePayload {
  provider: string;
  workspaceId: string;
  redirectTo?: string;
  timestamp: number;
}

function parseState(stateStr: string): StatePayload | null {
  try {
    const decoded = Buffer.from(stateStr, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

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

  // Handle OAuth errors
  if (error) {
    const returnUrl = new URL("/integrations-new?error=oauth_failed", request.url);
    returnUrl.searchParams.set("error_detail", errorDescription || error);
    return NextResponse.redirect(returnUrl);
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/integrations-new?error=missing_code", request.url));
  }

  const stateData = parseState(state);
  if (!stateData) {
    return NextResponse.redirect(new URL("/integrations-new?error=invalid_state", request.url));
  }

  // Verify state is recent (within 10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(new URL("/integrations-new?error=state_expired", request.url));
  }

  const { provider, workspaceId, redirectTo } = stateData;
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`;

  // Exchange code for token
  const token = await exchangeCodeForToken(provider, code, redirectUri);
  if (!token) {
    return NextResponse.redirect(
      new URL("/integrations-new?error=token_exchange_failed", request.url)
    );
  }

  // Save token to workspace config
  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("config")
    .eq("id", workspaceId)
    .single();

  if (fetchError) {
    return NextResponse.redirect(
      new URL("/integrations-new?error=workspace_not_found", request.url)
    );
  }

  const currentConfig = workspace?.config || {};
  const updatedConfig = {
    ...currentConfig,
    oauth: {
      ...(currentConfig.oauth || {}),
      [provider]: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scope: token.scope,
        tokenType: token.tokenType,
        connectedAt: new Date().toISOString(),
      },
    },
  };

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ config: updatedConfig })
    .eq("id", workspaceId);

  if (updateError) {
    return NextResponse.redirect(
      new URL("/integrations-new?error=config_save_failed", request.url)
    );
  }

  // Redirect back to integrations with success message
  const returnUrl = new URL(
    redirectTo || "/integrations-new",
    request.url
  );
  returnUrl.searchParams.set("oauth_success", provider);
  return NextResponse.redirect(returnUrl);
}
