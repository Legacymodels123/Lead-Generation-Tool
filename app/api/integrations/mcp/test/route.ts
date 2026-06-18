import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceConfigForApi, saveWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";
import type { McpConnection } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    workspaceId: string;
    server?: McpConnection;
    testUrl?: string;
  };

  if (!body.workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  if (body.server) {
    const config = await getWorkspaceConfigForApi(body.workspaceId);
    const list = [...(config.mcpServers ?? [])];
    const idx = list.findIndex((s) => s.id === body.server!.id);
    const entry = { ...body.server, lastCheckedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    await saveWorkspaceConfigForApi(body.workspaceId, { mcpServers: list });
  }

  const url = body.testUrl || body.server?.url;
  if (!url) {
    return NextResponse.json({ ok: true, status: "saved" });
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body.server?.authType === "bearer" && body.server.token) {
      headers.Authorization = `Bearer ${body.server.token}`;
    }
    if (body.server?.headers) Object.assign(headers, body.server.headers);

    const res = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(8000) });
    return NextResponse.json({
      ok: res.ok,
      status: res.ok ? "ok" : "error",
      httpStatus: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      status: "error",
      error: err instanceof Error ? err.message : "Connection failed",
    });
  }
}
