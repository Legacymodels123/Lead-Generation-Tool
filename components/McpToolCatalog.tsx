"use client";

import { useCallback, useEffect, useState } from "react";
import type { McpConnection } from "@/lib/types";
import {
  MCP_CATEGORY_LABELS,
  MCP_TOOL_CATALOG,
  type McpToolPreset,
  presetToDraft,
} from "@/lib/mcp/catalog";

interface Props {
  workspaceId: string;
  servers: McpConnection[];
  onChange: () => void;
}

export default function McpToolCatalog({ workspaceId, servers, onChange }: Props) {
  const [connecting, setConnecting] = useState<McpToolPreset | null>(null);
  const [draft, setDraft] = useState<Partial<McpConnection>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [discoveredTools, setDiscoveredTools] = useState<string[]>([]);

  const connectedCatalogIds = new Set(
    servers.filter((s) => s.catalogId).map((s) => s.catalogId)
  );

  const openConnect = useCallback((preset: McpToolPreset) => {
    setConnecting(preset);
    setDraft({
      ...presetToDraft(preset),
      id: `mcp-${preset.id}-${Date.now()}`,
    });
    setMessage("");
    setDiscoveredTools([]);
  }, []);

  useEffect(() => {
    if (!connecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConnecting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connecting]);

  async function saveAndDiscover() {
    if (!draft.name?.trim() || !draft.url?.trim()) {
      setMessage("Name and URL are required");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const server: McpConnection = {
        id: draft.id ?? `mcp-${Date.now()}`,
        name: draft.name.trim(),
        url: draft.url.trim(),
        authType: draft.authType ?? "none",
        token: draft.token,
        enabled: draft.enabled ?? true,
        catalogId: draft.catalogId,
        category: draft.category,
        description: draft.description,
      };

      const res = await fetch("/api/integrations/mcp/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, server, save: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        tools?: string[];
        status?: string;
        error?: string;
      };

      if (data.tools?.length) {
        setDiscoveredTools(data.tools);
      }

      if (data.ok || data.status === "reachable") {
        setMessage(
          data.tools?.length
            ? `Connected — ${data.tools.length} tool${data.tools.length === 1 ? "" : "s"} available`
            : "Connected (endpoint reachable)"
        );
        onChange();
        setTimeout(() => setConnecting(null), 1200);
      } else {
        setMessage(data.error ?? "Could not reach MCP server");
      }
    } catch {
      setMessage("Connection failed");
    } finally {
      setSaving(false);
    }
  }

  async function rediscover(server: McpConnection) {
    setSaving(true);
    try {
      await fetch("/api/integrations/mcp/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, serverId: server.id, save: true }),
      });
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function removeServer(id: string) {
    const list = servers.filter((s) => s.id !== id);
    await fetch(`/api/workspaces/${workspaceId}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mcpServers: list }),
    });
    onChange();
  }

  const byCategory = MCP_TOOL_CATALOG.reduce<Record<string, McpToolPreset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <section className="mcp-catalog-section" id="mcp">
      <div className="mcp-catalog-head">
        <div>
          <h2 className="connections-title">MCP tool connections</h2>
          <p className="connections-sub">
            Plug in Model Context Protocol servers so agents can use HubSpot, LinkedIn, Sheets, and more.
          </p>
        </div>
      </div>

      {servers.length > 0 && (
        <div className="mcp-connected-list">
          <h3 className="mcp-connected-title">Connected</h3>
          {servers.map((server) => {
            const preset = MCP_TOOL_CATALOG.find((p) => p.id === server.catalogId);
            return (
              <div
                key={server.id}
                className={`mcp-connected-card${server.lastStatus === "ok" ? " on" : ""}`}
              >
                <div className="mcp-connected-top">
                  <span className={`mcp-catalog-glyph ${preset?.accent ?? "mcp-custom"}`}>
                    {preset?.glyph ?? "⚙"}
                  </span>
                  <div>
                    <strong>{server.name}</strong>
                    <span className="mcp-connected-url">{server.url}</span>
                  </div>
                  <span className={`connection-status${server.lastStatus === "ok" ? " on" : ""}`}>
                    {server.lastStatus === "ok" ? "Live" : server.lastStatus ?? "unknown"}
                  </span>
                </div>
                {server.tools && server.tools.length > 0 && (
                  <div className="mcp-tool-chips">
                    {server.tools.slice(0, 8).map((t) => (
                      <span key={t} className="mcp-tool-chip">
                        {t}
                      </span>
                    ))}
                    {(server.toolCount ?? server.tools.length) > 8 && (
                      <span className="mcp-tool-chip mcp-tool-chip-more">
                        +{(server.toolCount ?? server.tools.length) - 8} more
                      </span>
                    )}
                  </div>
                )}
                <div className="mcp-connected-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={saving}
                    onClick={() => void rediscover(server)}
                  >
                    Refresh tools
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => void removeServer(server.id)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Object.entries(byCategory).map(([category, presets]) => (
        <div key={category} className="mcp-catalog-group">
          <h3 className="mcp-catalog-group-title">
            {MCP_CATEGORY_LABELS[category as keyof typeof MCP_CATEGORY_LABELS]}
          </h3>
          <div className="mcp-catalog-grid">
            {presets.map((preset) => {
              const isConnected = connectedCatalogIds.has(preset.id) && preset.id !== "custom";
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`mcp-catalog-card ${preset.accent}${isConnected ? " connected" : ""}`}
                  onClick={() => openConnect(preset)}
                >
                  <span className="mcp-catalog-glyph">{preset.glyph}</span>
                  <strong>{preset.name}</strong>
                  <span className="mcp-catalog-tag">{preset.tagline}</span>
                  <span className="mcp-catalog-cta">
                    {isConnected ? "Add another" : "Connect"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {connecting && (
        <div className="mcp-connect-overlay" onClick={() => setConnecting(null)} role="presentation">
          <div
            className="mcp-connect-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="mcp-connect-title"
          >
            <div className="mcp-connect-head">
              <span className={`mcp-catalog-glyph ${connecting.accent}`}>{connecting.glyph}</span>
              <div>
                <h3 id="mcp-connect-title">Connect {connecting.name}</h3>
                <p>{connecting.setupHint}</p>
              </div>
              <button
                type="button"
                className="property-creator-close"
                onClick={() => setConnecting(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <label className="column-property-field">
              <span>Display name</span>
              <input
                value={draft.name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <label className="column-property-field">
              <span>MCP endpoint URL</span>
              <input
                value={draft.url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                placeholder={connecting.defaultUrl}
              />
            </label>
            {(draft.authType === "bearer" || connecting.authType === "bearer") && (
              <label className="column-property-field">
                <span>Bearer token / API key</span>
                <input
                  type="password"
                  value={draft.token ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, token: e.target.value, authType: "bearer" }))}
                  placeholder="Paste secret token"
                />
              </label>
            )}
            {connecting.docsUrl && (
              <a
                className="mcp-docs-link"
                href={connecting.docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                View {connecting.name} documentation →
              </a>
            )}

            {discoveredTools.length > 0 && (
              <div className="mcp-tool-chips">
                {discoveredTools.map((t) => (
                  <span key={t} className="mcp-tool-chip">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {message && <p className={`mcp-connect-message${message.startsWith("Connected") ? " ok" : ""}`}>{message}</p>}

            <div className="mcp-connect-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setConnecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={saving}
                onClick={() => void saveAndDiscover()}
              >
                {saving ? "Connecting…" : "Test & connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
