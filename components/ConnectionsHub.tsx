"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceConfig } from "@/lib/types";
import {
  CORE_INTEGRATIONS,
  ENRICHMENT_INTEGRATIONS,
  INTEGRATION_SECTIONS,
  methodLabel,
  type IntegrationDef,
} from "@/lib/integrations/catalog";
import IntegrationsOverview from "@/components/IntegrationsOverview";
import McpToolCatalog from "@/components/McpToolCatalog";
import { isIntegrationConnected, integrationConnectionSource } from "@/lib/integrations/status";
import { useAuth } from "@/lib/auth";

type ApiProviderId = string;

interface Props {
  workspaceId: string;
  compact?: boolean;
  focusProvider?: string | null;
}

function IntegrationCard({
  integration,
  connected,
  connectionSource,
  highlighted,
  draftKey,
  onDraftChange,
  saving,
  onSave,
  onTest,
  onOAuth,
}: {
  integration: IntegrationDef;
  connected: boolean;
  connectionSource: "api_key" | "oauth" | null;
  highlighted: boolean;
  draftKey: string;
  onDraftChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onTest?: () => void;
  onOAuth?: () => void;
}) {
  const showOAuth = integration.method === "api_key_or_oauth" && onOAuth;
  const showTest = integration.section === "ai" && onTest;

  return (
    <article
      id={`connection-${integration.id}`}
      className={`integration-setup-card ${integration.brand}${connected ? " connected" : ""}${highlighted ? " focused" : ""}`}
    >
      <header className="integration-setup-head">
        <span className="connection-feature-glyph">{integration.glyph}</span>
        <div className="integration-setup-titles">
          <strong>{integration.label}</strong>
          <span className="integration-setup-purpose">{integration.purpose}</span>
        </div>
        <span className={`integration-method-badge${integration.method.includes("oauth") ? " oauth" : ""}`}>
          {methodLabel(integration.method)}
        </span>
      </header>

      <ul className="integration-used-for">
        {integration.usedFor.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className={`integration-setup-status${connected ? " on" : ""}`}>
        {connected
          ? connectionSource === "oauth"
            ? "✓ Connected via OAuth"
            : "✓ Connected via API key"
          : "Not connected yet"}
      </div>

      {showOAuth && (
        <div className="integration-setup-oauth">
          <button type="button" className="btn-primary btn-sm" onClick={onOAuth}>
            {connected ? "Reconnect with OAuth" : "Connect with OAuth"}
          </button>
          <span className="integration-setup-or">or paste a token</span>
        </div>
      )}

      <label className="integration-setup-field">
        <span className="sr-only">{integration.label} API key</span>
        <input
          className="settings-input"
          type="password"
          placeholder={
            integration.method === "api_key_or_oauth"
              ? `Paste ${integration.label} access token`
              : `Paste ${integration.label} API key`
          }
          value={draftKey}
          onChange={(e) => onDraftChange(e.target.value)}
        />
      </label>

      <div className="connection-card-actions">
        <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : connected ? "Update key" : "Save & connect"}
        </button>
        {showTest && (
          <button type="button" className="btn-secondary btn-sm" disabled={saving} onClick={onTest}>
            Test connection
          </button>
        )}
      </div>
    </article>
  );
}

function IntegrationSection({
  sectionId,
  sectionKey,
  children,
}: {
  sectionId: string;
  sectionKey: keyof typeof INTEGRATION_SECTIONS;
  children: ReactNode;
}) {
  const meta = INTEGRATION_SECTIONS[sectionKey];
  return (
    <section id={sectionId} className="integration-section">
      <div className="integration-section-head">
        <span className="integration-section-step">{meta.step}</span>
        <div>
          <h2 className="integration-section-title">{meta.title}</h2>
          <p className="integration-section-desc">{meta.description}</p>
        </div>
      </div>
      <div className="integration-section-grid">{children}</div>
    </section>
  );
}

export default function ConnectionsHub({
  workspaceId,
  compact = false,
  focusProvider = null,
}: Props) {
  const { token, user } = useAuth();
  const [config, setConfig] = useState<WorkspaceConfig>({});
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`);
      if (res.ok) {
        setConfig((await res.json()) as WorkspaceConfig);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusProvider) return;
    const el = document.getElementById(`connection-${focusProvider}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusProvider, loading]);

  async function saveKey(provider: ApiProviderId) {
    const value = draftKeys[provider]?.trim();
    if (!value) return;
    if (!token) {
      setMessage("Log eerst in om API keys op te slaan.");
      setMessageOk(false);
      return;
    }
    setSaving(provider);
    setMessage("");
    setMessageOk(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ apiKeys: { [provider]: value } }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        _meta?: { storage?: string };
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Opslaan mislukt");
      }
      setDraftKeys((prev) => ({ ...prev, [provider]: "" }));
      await load();
      const storage = data._meta?.storage;
      if (storage === "memory") {
        setMessage(
          "Key tijdelijk opgeslagen (alleen lokaal). Zet SUPABASE_SERVICE_ROLE_KEY op Vercel voor permanente opslag."
        );
        setMessageOk(false);
      } else {
        setMessage(`${provider} opgeslagen in cloud`);
        setMessageOk(true);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `Opslaan van ${provider} mislukt`);
      setMessageOk(false);
    } finally {
      setSaving(null);
    }
  }

  async function testKey(provider: "openai" | "anthropic") {
    setSaving(`test-${provider}`);
    setMessage("");
    try {
      const route = `/api/integrations/test/${provider}`;
      const res = await fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setMessage(
        res.ok
          ? `${provider} works${data.message ? `: ${data.message}` : ""}`
          : `Test failed: ${data.error ?? res.statusText}`
      );
    } catch {
      setMessage("Connection test failed");
    } finally {
      setSaving(null);
    }
  }

  function connectOAuth(provider: "linkedin" | "hubspot") {
    const oauthProvider = provider === "hubspot" ? "hubspot_oauth" : "linkedin";
    const userParam = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
    window.location.href = `/api/oauth/authorize?provider=${oauthProvider}&workspace_id=${encodeURIComponent(workspaceId)}&redirect_to=${encodeURIComponent("/integrations")}${userParam}`;
  }

  if (loading) return <p className="connections-loading">Loading connections…</p>;

  if (compact) {
    return (
      <p className="connections-sub">
        Open <a href="/integrations">Integrations</a> to manage API keys and MCP tools.
      </p>
    );
  }

  const renderCard = (integration: IntegrationDef) => (
    <IntegrationCard
      key={integration.id}
      integration={integration}
      connected={isIntegrationConnected(config, integration.id)}
      connectionSource={integrationConnectionSource(config, integration.id)}
      highlighted={focusProvider === integration.id}
      draftKey={draftKeys[integration.id] ?? ""}
      onDraftChange={(v) => setDraftKeys((prev) => ({ ...prev, [integration.id]: v }))}
      saving={saving === integration.id || saving === `test-${integration.id}`}
      onSave={() => void saveKey(integration.id)}
      onTest={
        integration.id === "openai" || integration.id === "anthropic"
          ? () => void testKey(integration.id as "openai" | "anthropic")
          : undefined
      }
      onOAuth={
        integration.id === "hubspot" || integration.id === "linkedin"
          ? () => connectOAuth(integration.id as "hubspot" | "linkedin")
          : undefined
      }
    />
  );

  return (
    <div className="connections-hub" ref={focusRef}>
      <IntegrationsOverview config={config} />

      <IntegrationSection sectionId="section-ai" sectionKey="ai">
        {CORE_INTEGRATIONS.filter((i) => i.section === "ai").map(renderCard)}
      </IntegrationSection>

      <IntegrationSection sectionId="section-crm" sectionKey="crm">
        {CORE_INTEGRATIONS.filter((i) => i.section === "crm").map(renderCard)}
      </IntegrationSection>

      <IntegrationSection sectionId="section-enrichment" sectionKey="enrichment">
        {ENRICHMENT_INTEGRATIONS.map(renderCard)}
      </IntegrationSection>

      <section id="mcp" className="integration-section integration-section-mcp">
        <div className="integration-section-head">
          <span className="integration-section-step">{INTEGRATION_SECTIONS.mcp.step}</span>
          <div>
            <h2 className="integration-section-title">{INTEGRATION_SECTIONS.mcp.title}</h2>
            <p className="integration-section-desc">{INTEGRATION_SECTIONS.mcp.description}</p>
          </div>
        </div>
        <McpToolCatalog
          workspaceId={workspaceId}
          servers={config.mcpServers ?? []}
          onChange={() => void load()}
        />
      </section>

      {message && (
        <p className={`connections-message${messageOk ? " ok" : " err"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
