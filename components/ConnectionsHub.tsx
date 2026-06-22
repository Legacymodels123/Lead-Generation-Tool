"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { McpConnection, WorkspaceConfig } from "@/lib/types";

const FEATURED = [
  { id: "openai", label: "ChatGPT", brand: "integration-openai", glyph: "◆" },
  { id: "anthropic", label: "Claude", brand: "integration-anthropic", glyph: "✦" },
  { id: "hubspot", label: "HubSpot", brand: "integration-hubspot", glyph: "⬡" },
  { id: "linkedin", label: "LinkedIn", brand: "integration-linkedin", glyph: "in" },
] as const;

const OTHER_PROVIDERS = [
  { id: "hunter", label: "Hunter" },
  { id: "apollo", label: "Apollo" },
  { id: "instantly", label: "Instantly" },
] as const;

type ApiProviderId =
  | (typeof FEATURED)[number]["id"]
  | (typeof OTHER_PROVIDERS)[number]["id"];

interface Props {
  workspaceId: string;
  compact?: boolean;
  focusProvider?: string | null;
}

export default function ConnectionsHub({
  workspaceId,
  compact = false,
  focusProvider = null,
}: Props) {
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
  const focusRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!focusProvider || !focusRef.current) return;
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusProvider, loading]);

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

  async function testKey(provider: "openai" | "anthropic") {
    setSaving(`test-${provider}`);
    setMessage("");
    try {
      const route = `/api/integrations/test/${provider === "openai" ? "openai" : "anthropic"}`;
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setMessage(
        res.ok
          ? `${provider} test OK${data.message ? `: ${data.message}` : ""}`
          : `${provider} test failed: ${data.error ?? res.statusText}`
      );
    } catch {
      setMessage(`${provider} test error`);
    } finally {
      setSaving(null);
    }
  }

  function connectOAuth(provider: "linkedin" | "hubspot") {
    const oauthProvider = provider === "hubspot" ? "hubspot_oauth" : "linkedin";
    window.location.href = `/api/oauth/authorize?provider=${oauthProvider}&workspace_id=${encodeURIComponent(workspaceId)}&redirect_to=${encodeURIComponent("/integrations")}`;
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
      <div className="connections-featured-grid" ref={focusRef}>
        {FEATURED.map((p) => {
          const connected = Boolean(
            config.apiKeys?.[p.id as keyof NonNullable<WorkspaceConfig["apiKeys"]>]
          );
          const highlighted = focusProvider === p.id;
          const isOAuth = p.id === "linkedin" || p.id === "hubspot";

          return (
            <div
              key={p.id}
              id={`connection-${p.id}`}
              className={`connection-feature-card ${p.brand}${connected ? " connected" : ""}${highlighted ? " focused" : ""}`}
            >
              <div className="connection-feature-top">
                <span className="connection-feature-glyph">{p.glyph}</span>
                <div>
                  <strong>{p.label}</strong>
                  <span className={`connection-feature-status${connected ? " on" : ""}`}>
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>

              {isOAuth ? (
                <div className="connection-feature-actions">
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => connectOAuth(p.id as "linkedin" | "hubspot")}
                  >
                    {connected ? "Reconnect" : "Connect with OAuth"}
                  </button>
                  <p className="connection-feature-hint">Or paste an access token below</p>
                </div>
              ) : null}

              <input
                className="settings-input connection-feature-input"
                type="password"
                placeholder={`Paste ${p.label} API key`}
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
                  {saving === p.id ? "…" : "Save key"}
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

      <h2 className="connections-title">More integrations</h2>
      <div className="connections-grid">
        {OTHER_PROVIDERS.map((p) => {
          const connected = Boolean(
            config.apiKeys?.[p.id as keyof NonNullable<WorkspaceConfig["apiKeys"]>]
          );
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
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={saving === p.id}
                onClick={() => void saveKey(p.id)}
              >
                {saving === p.id ? "…" : "Connect"}
              </button>
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
