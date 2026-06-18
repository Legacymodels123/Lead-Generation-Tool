"use client";

import { useCallback, useEffect, useState } from "react";
import type { McpConnection, WorkspaceConfig } from "@/lib/types";

const API_PROVIDERS = [
  { id: "openai", label: "OpenAI", envHint: "OPENAI_API_KEY" },
  { id: "anthropic", label: "Anthropic", envHint: "ANTHROPIC_API_KEY" },
  { id: "hunter", label: "Hunter", envHint: "HUNTER_API_KEY" },
  { id: "apollo", label: "Apollo", envHint: "APOLLO_API_KEY" },
  { id: "hubspot", label: "HubSpot", envHint: "HUBSPOT_ACCESS_TOKEN" },
  { id: "instantly", label: "Instantly", envHint: "INSTANTLY_API_KEY" },
] as const;

type ApiProviderId = (typeof API_PROVIDERS)[number]["id"];

interface Props {
  workspaceId: string;
  compact?: boolean;
}

export default function ConnectionsHub({ workspaceId, compact = false }: Props) {
  const [config, setConfig] = useState<WorkspaceConfig>({});
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [mcpDraft, setMcpDraft] = useState<Partial<McpConnection>>({
    name: "",
    url: "",
    authType: "none",
    enabled: true,
  });
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`);
      if (res.ok) {
        const data = (await res.json()) as WorkspaceConfig;
        setConfig(data);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveKey(provider: ApiProviderId) {
    const value = draftKeys[provider]?.trim();
    if (!value) return;
    setSaving(provider);
    setMessage("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: { [provider]: value } }),
      });
      if (!res.ok) throw new Error("save failed");
      setDraftKeys((prev) => ({ ...prev, [provider]: "" }));
      await load();
      setMessage(`${provider} connected`);
    } catch {
      setMessage(`Failed to save ${provider}`);
    } finally {
      setSaving(null);
    }
  }

  async function testKey(provider: ApiProviderId) {
    setSaving(`test-${provider}`);
    setMessage("");
    try {
      const route =
        provider === "openai" || provider === "anthropic"
          ? `/api/integrations/test/${provider === "openai" ? "openai" : "anthropic"}`
          : null;
      if (!route) {
        setMessage(`Test not available for ${provider}`);
        return;
      }
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      setMessage(res.ok ? `${provider} test OK` : `${provider} test failed`);
    } catch {
      setMessage(`${provider} test error`);
    } finally {
      setSaving(null);
    }
  }

  async function addMcpServer() {
    if (!mcpDraft.name?.trim() || !mcpDraft.url?.trim()) return;
    const server: McpConnection = {
      id: `mcp-${Date.now()}`,
      name: mcpDraft.name.trim(),
      url: mcpDraft.url.trim(),
      authType: mcpDraft.authType ?? "none",
      token: mcpDraft.token,
      enabled: mcpDraft.enabled ?? true,
    };
    setSaving("mcp");
    try {
      const res = await fetch("/api/integrations/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, server, testUrl: server.url }),
      });
      const test = await res.json();
      server.lastStatus = test.ok ? "ok" : "error";
      server.lastCheckedAt = new Date().toISOString();

      const list = [...(config.mcpServers ?? []), server];
      await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcpServers: list }),
      });
      setMcpDraft({ name: "", url: "", authType: "none", enabled: true, token: "" });
      await load();
      setMessage(test.ok ? "MCP server added" : "MCP saved (endpoint test failed)");
    } catch {
      setMessage("Failed to add MCP server");
    } finally {
      setSaving(null);
    }
  }

  async function removeMcp(id: string) {
    const list = (config.mcpServers ?? []).filter((s) => s.id !== id);
    await fetch(`/api/workspaces/${workspaceId}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mcpServers: list }),
    });
    await load();
  }

  if (loading) return <p className="connections-loading">Loading connections…</p>;

  return (
    <div className={`connections-hub${compact ? " connections-hub-compact" : ""}`}>
      <h2 className="connections-title">API keys</h2>
      <p className="connections-sub">
        Workspace keys override environment variables for this demo workspace.
      </p>
      <div className="connections-grid">
        {API_PROVIDERS.map((p) => {
          const connected = Boolean(config.apiKeys?.[p.id as keyof NonNullable<WorkspaceConfig["apiKeys"]>]);
          return (
            <div key={p.id} className="connection-card">
              <div className="connection-card-head">
                <strong>{p.label}</strong>
                <span className={`connection-status${connected ? " on" : ""}`}>
                  {connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <input
                className="settings-input"
                type="password"
                placeholder={`Paste ${p.label} key`}
                value={draftKeys[p.id] ?? ""}
                onChange={(e) => setDraftKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
              />
              <div className="connection-card-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={saving === p.id}
                  onClick={() => void saveKey(p.id)}
                >
                  {saving === p.id ? "…" : "Connect"}
                </button>
                {(p.id === "openai" || p.id === "anthropic") && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={saving === `test-${p.id}`}
                    onClick={() => void testKey(p.id)}
                  >
                    Test
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="connections-title connections-title-mcp">MCP servers</h2>
      <p className="connections-sub">Register MCP endpoints for future AI column tooling.</p>

      {(config.mcpServers ?? []).map((server) => (
        <div key={server.id} className="connection-card mcp-card">
          <div className="connection-card-head">
            <strong>{server.name}</strong>
            <span className={`connection-status${server.lastStatus === "ok" ? " on" : ""}`}>
              {server.lastStatus ?? "unknown"}
            </span>
          </div>
          <div className="mcp-url">{server.url}</div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void removeMcp(server.id)}>
            Remove
          </button>
        </div>
      ))}

      <div className="connection-card mcp-form">
        <input
          className="settings-input"
          placeholder="Server name"
          value={mcpDraft.name ?? ""}
          onChange={(e) => setMcpDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <input
          className="settings-input"
          placeholder="MCP URL"
          value={mcpDraft.url ?? ""}
          onChange={(e) => setMcpDraft((d) => ({ ...d, url: e.target.value }))}
        />
        <select
          className="settings-input"
          value={mcpDraft.authType ?? "none"}
          onChange={(e) =>
            setMcpDraft((d) => ({ ...d, authType: e.target.value as McpConnection["authType"] }))
          }
        >
          <option value="none">No auth</option>
          <option value="bearer">Bearer token</option>
          <option value="header">Custom headers</option>
        </select>
        {mcpDraft.authType === "bearer" && (
          <input
            className="settings-input"
            type="password"
            placeholder="Bearer token"
            value={mcpDraft.token ?? ""}
            onChange={(e) => setMcpDraft((d) => ({ ...d, token: e.target.value }))}
          />
        )}
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={saving === "mcp"}
          onClick={() => void addMcpServer()}
        >
          {saving === "mcp" ? "…" : "Add MCP server"}
        </button>
      </div>

      {message && <p className="connections-message">{message}</p>}
    </div>
  );
}
