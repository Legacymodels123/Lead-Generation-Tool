import { NextRequest, NextResponse } from "next/server";
import { discoverMcpServer } from "@/lib/mcp/client";
import { getWorkspaceConfigForApi, saveWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";
import type { McpConnection } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    workspaceId: string;
    server?: McpConnection;
    serverId?: string;
    save?: boolean;
  };

  if (!body.workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  let server = body.server;

  if (!server && body.serverId) {
    const config = await getWorkspaceConfigForApi(body.workspaceId);
    server = config.mcpServers?.find((s) => s.id === body.serverId);
  }

  if (!server?.url) {
    return NextResponse.json({ error: "Missing server or url" }, { status: 400 });
  }

  const discovery = await discoverMcpServer(server);

  if (body.save !== false) {
    const config = await getWorkspaceConfigForApi(body.workspaceId);
    const list = [...(config.mcpServers ?? [])];
    const entry: McpConnection = {
      ...server,
      lastCheckedAt: new Date().toISOString(),
      lastStatus: discovery.ok ? "ok" : "error",
      tools: discovery.tools,
      toolCount: discovery.tools.length,
    };
    const idx = list.findIndex((s) => s.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    await saveWorkspaceConfigForApi(body.workspaceId, { mcpServers: list });
  }

  return NextResponse.json(discovery);
}
