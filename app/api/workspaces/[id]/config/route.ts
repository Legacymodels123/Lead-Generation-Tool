import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceConfigForApi,
  saveWorkspaceConfigForApi,
} from "@/lib/server/workspace-config-api";
import type { WorkspaceConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mask = request.nextUrl.searchParams.get("mask") === "1";
  const config = await getWorkspaceConfigForApi(id, mask);
  return NextResponse.json(config);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = (await request.json()) as Partial<WorkspaceConfig>;

    if (body.apiKeys) {
      for (const [, value] of Object.entries(body.apiKeys)) {
        if (value !== undefined && typeof value !== "string") {
          return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
        }
      }
    }

    const merged = await saveWorkspaceConfigForApi(id, body);
    return NextResponse.json(merged);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
