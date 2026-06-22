import type { McpConnection } from "@/lib/types";

export interface McpDiscoverResult {
  ok: boolean;
  status: "ok" | "reachable" | "error";
  tools: string[];
  serverName?: string;
  error?: string;
  httpStatus?: number;
}

function authHeaders(server: McpConnection): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (server.authType === "bearer" && server.token) {
    headers.Authorization = `Bearer ${server.token}`;
  }
  if (server.headers) Object.assign(headers, server.headers);
  return headers;
}

async function jsonRpc(
  url: string,
  headers: Record<string, string>,
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (data.error) {
    throw new Error(data.error.message ?? "MCP error");
  }
  return data.result;
}

function parseTools(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const tools = (result as { tools?: Array<{ name?: string }> }).tools;
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => t.name).filter((n): n is string => Boolean(n));
}

/** Probe an MCP HTTP endpoint and list available tools when possible. */
export async function discoverMcpServer(server: McpConnection): Promise<McpDiscoverResult> {
  const headers = authHeaders(server);
  const candidates = [
    server.url,
    server.url.replace(/\/$/, "") + "/mcp",
    server.url.replace(/\/$/, "") + "/sse",
  ];
  const unique = [...new Set(candidates)];

  for (const url of unique) {
    try {
      try {
        await jsonRpc(url, headers, "initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "legacy-leadgen", version: "1.0.0" },
        });
      } catch {
        /* some servers skip initialize */
      }

      const listResult = await jsonRpc(url, headers, "tools/list", {});
      const tools = parseTools(listResult);
      return {
        ok: true,
        status: "ok",
        tools,
        serverName: server.name,
      };
    } catch {
      /* try next candidate */
    }
  }

  try {
    const res = await fetch(server.url, {
      method: "GET",
      headers: authHeaders(server),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      return {
        ok: true,
        status: "reachable",
        tools: [],
        httpStatus: res.status,
        error: "Server reachable but MCP tools/list not supported at this URL",
      };
    }
    return {
      ok: false,
      status: "error",
      tools: [],
      httpStatus: res.status,
      error: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: "error",
      tools: [],
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
