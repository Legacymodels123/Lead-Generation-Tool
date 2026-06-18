import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");
  const workspaceId = searchParams.get("workspace_id");
  const redirectTo = searchParams.get("redirect_to");

  if (!provider || !workspaceId) {
    return NextResponse.json(
      { error: "Missing provider or workspace_id" },
      { status: 400 }
    );
  }

  const clientId =
    provider === "linkedin"
      ? process.env.LINKEDIN_CLIENT_ID
      : provider === "hubspot_oauth"
        ? process.env.HUBSPOT_CLIENT_ID
        : null;

  if (!clientId) {
    return NextResponse.json(
      { error: "Provider not configured" },
      { status: 500 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      provider,
      workspaceId,
      redirectTo,
      timestamp: Date.now(),
    })
  ).toString("base64");

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`;

  const authUrls: Record<string, string> = {
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=r_liteprofile%20r_emailaddress`,
    hubspot_oauth: `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("crm.objects.companies.read crm.objects.companies.write crm.objects.contacts.read crm.objects.contacts.write")}&state=${state}`,
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
