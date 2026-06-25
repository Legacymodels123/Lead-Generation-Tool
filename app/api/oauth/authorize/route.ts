import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { signOAuthState } from "@/lib/oauth/state";
import { canAccessWorkspace } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const auth = await getApiAuth(request);
  if (!auth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl);
  }

  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");
  const workspaceId = searchParams.get("workspace_id");
  const redirectTo = searchParams.get("redirect_to") ?? "/integrations";

  if (!provider || !workspaceId) {
    return NextResponse.json(
      { error: "Missing provider or workspace_id" },
      { status: 400 }
    );
  }

  if (!canAccessWorkspace(auth, workspaceId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId =
    provider === "linkedin"
      ? process.env.LINKEDIN_CLIENT_ID
      : provider === "hubspot_oauth"
        ? process.env.HUBSPOT_CLIENT_ID
        : null;

  if (!clientId) {
    const missing =
      provider === "hubspot_oauth" ? "HUBSPOT_CLIENT_ID" : "LINKEDIN_CLIENT_ID";
    const returnUrl = new URL(redirectTo, request.url);
    returnUrl.searchParams.set("error", "oauth_not_configured");
    returnUrl.searchParams.set("error_detail", `${missing} is not set on the server.`);
    return NextResponse.redirect(returnUrl);
  }

  const state = signOAuthState({
    provider,
    workspaceId,
    userId: auth.userId,
    redirectTo,
    timestamp: Date.now(),
  });

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`;

  const authUrls: Record<string, string> = {
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=r_liteprofile%20r_emailaddress`,
    hubspot_oauth: `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("crm.objects.companies.read crm.objects.companies.write crm.objects.contacts.read crm.objects.contacts.write")}&state=${encodeURIComponent(state)}`,
  };

  const authUrl = authUrls[provider];
  if (!authUrl) {
    return NextResponse.json(
      { error: "Invalid provider" },
      { status: 400 }
    );
  }

  return NextResponse.redirect(authUrl);
}
