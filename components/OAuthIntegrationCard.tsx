"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import {
  fetchWorkspaceConfig,
  updateWorkspaceConfig,
  clearConfigCache,
} from "@/lib/workspace/config";
import type { WorkspaceConfig } from "@/lib/types";

interface OAuthProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  scopes: string;
  docs: string;
}

const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "linkedin",
    name: "LinkedIn Sales Navigator",
    description: "OAuth login & CSV export integratie",
    icon: "🔗",
    scopes: "r_liteprofile, r_emailaddress",
    docs: "https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication",
  },
  {
    id: "hubspot_oauth",
    name: "HubSpot (OAuth)",
    description: "Bidirectionele CRM sync zonder token",
    icon: "🔵",
    scopes: "crm.objects.companies, crm.objects.contacts",
    docs: "https://developers.hubspot.com/docs/api/working-with-oauth",
  },
];

interface Props {
  provider: OAuthProvider;
}

export default function OAuthIntegrationCard({ provider }: Props) {
  const { workspaceId } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStatus();
  }, [workspaceId]);

  async function loadStatus() {
    const config = await fetchWorkspaceConfig(workspaceId);
    const oauthData = (config.oauth as Record<string, any>)?.[provider.id];
    if (oauthData?.accessToken) {
      setIsConnected(true);
      setConnectedAt(oauthData.connectedAt);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setMessage("");

    try {
      const authUrl = `/api/oauth/authorize?provider=${provider.id}&workspace_id=${workspaceId}&redirect_to=/integrations-new`;
      window.location.href = authUrl;
    } catch (err) {
      setMessage("✗ Fout bij verbinden: " + (err instanceof Error ? err.message : "Unknown"));
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Zeker dat je deze verbinding wilt verbreken?")) return;

    setConnecting(true);
    try {
      const config = await fetchWorkspaceConfig(workspaceId);
      const oauth = config.oauth as Record<string, any> || {};
      delete oauth[provider.id];

      await updateWorkspaceConfig(workspaceId, { oauth });
      clearConfigCache(workspaceId);

      setIsConnected(false);
      setConnectedAt(null);
      setMessage("✓ Verbinding verbroken");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Fout: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginBottom: 12,
        background: isConnected ? "#f0fdf4" : "#fafafa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{provider.icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{provider.name}</h4>
          <p style={{ margin: 0, fontSize: 13, color: "#666", marginTop: 2 }}>
            {provider.description}
          </p>
        </div>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: isConnected ? "#dcfce7" : "#f3f4f6",
            color: isConnected ? "#166534" : "#6b7280",
          }}
        >
          {isConnected ? "✓ Verbonden" : "○ Niet verbonden"}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px 0" }}>
          Scopes: <code style={{ background: "#f3f4f6", padding: "2px 4px" }}>{provider.scopes}</code>
        </p>
        {connectedAt && (
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>
            Verbonden sinds {new Date(connectedAt).toLocaleString("nl-NL")}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {!isConnected ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleConnect}
            disabled={connecting}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {connecting ? "Verbinden..." : "Verbind via " + provider.name}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDisconnect}
              disabled={connecting}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              Verbreek verbinding
            </button>
            <a
              href={provider.docs}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                fontSize: 13,
                background: "#f3f4f6",
                color: "#0066cc",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
              }}
            >
              Docs →
            </a>
          </>
        )}
      </div>

      {message && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: message.includes("✓") ? "#166534" : "#991b1b",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
