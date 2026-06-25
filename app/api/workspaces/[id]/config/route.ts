import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { syncWorkspaceKeysToConnections } from "@/lib/integrations/credentials";
import {
  getWorkspaceConfigForApi,
  saveWorkspaceConfigForApi,
} from "@/lib/server/workspace-config-api";
import { maskWorkspaceConfig } from "@/lib/server/workspace-config-store";
import { canAccessWorkspace } from "@/lib/workspace-access";
import type { WorkspaceConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!canAccessWorkspace(auth, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getWorkspaceConfigForApi(id, true);
  return NextResponse.json(config);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!canAccessWorkspace(auth, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<WorkspaceConfig>;

    if (body.apiKeys) {
      for (const [, value] of Object.entries(body.apiKeys)) {
        if (value !== undefined && typeof value !== "string") {
          return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
        }
      }
    }

    const result = await saveWorkspaceConfigForApi(id, body);

    if (body.apiKeys) {
      await syncWorkspaceKeysToConnections(id, auth.userId, result.config.apiKeys ?? {});
    }

    return NextResponse.json({
      ...maskWorkspaceConfig(result.config),
      _meta: { storage: result.storage },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
