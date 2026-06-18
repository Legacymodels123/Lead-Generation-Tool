import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import {
  deleteIntegrationConnection,
  listIntegrationConnections,
  saveIntegrationConnection,
} from "@/lib/integrations/credentials";
import type { IntegrationProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS = new Set<IntegrationProvider>([
  "openai",
  "anthropic",
  "hubspot",
  "hunter",
  "apollo",
  "firecrawl",
  "linkedin",
]);

export async function GET(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await listIntegrationConnections(auth.workspaceId, auth.userId);
  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, accessToken } = body as {
    provider: IntegrationProvider;
    accessToken: string;
  };

  if (!provider || !accessToken) {
    return NextResponse.json({ error: "provider and accessToken required" }, { status: 400 });
  }
  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await saveIntegrationConnection(auth.workspaceId, auth.userId, provider, accessToken);
  return NextResponse.json({ success: true, provider, status: "connected" });
}

export async function DELETE(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") as IntegrationProvider;
  if (!provider || !VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await deleteIntegrationConnection(auth.workspaceId, auth.userId, provider);
  return NextResponse.json({ success: true });
}
