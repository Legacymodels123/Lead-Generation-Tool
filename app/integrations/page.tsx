"use client";


import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const INTEGRATIONS = [
  {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    description: "AI-powered lead qualification and enrichment",
    status: "connected",
    action: "Configure",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Import leads and profiles from LinkedIn",
    status: "disconnected",
    action: "Connect",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Sync qualified leads to HubSpot",
    status: "disconnected",
    action: "Connect",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Track email opens and sends",
    status: "disconnected",
    action: "Connect",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications in Slack",
    status: "disconnected",
    action: "Connect",
  },
];

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleConnect = async (integrationId: string) => {
    if (integrationId === "openai") {
      setSelectedIntegration(integrationId);
      return;
    }

    // OAuth flows for other services
    const oauthUrls: { [key: string]: string } = {
      linkedin: `/api/oauth/authorize?provider=linkedin`,
      hubspot: `/api/oauth/authorize?provider=hubspot`,
      slack: `/api/oauth/authorize?provider=slack`,
      gmail: `/api/oauth/authorize?provider=gmail`,
    };

    if (oauthUrls[integrationId]) {
      window.location.href = oauthUrls[integrationId];
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey) return;
    setSaving(true);

    try {
      const response = await fetch("/api/integrations/test/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (response.ok) {
        // Store the key in localStorage for demo purposes
        localStorage.setItem("openai_api_key", apiKey);
        setApiKey("");
        setSelectedIntegration(null);
        alert("✓ OpenAI API key saved successfully!");
      } else {
        alert("✗ Invalid API key. Please check and try again.");
      }
    } catch (error) {
      alert("✗ Failed to save API key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>Integrations</h1>
      <p style={{ color: "#666", fontSize: "13px", marginBottom: "24px" }}>
        Connect external tools and services to automate your workflow
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            style={{
              padding: "16px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                {integration.name}
              </h3>
              <p style={{ fontSize: "12px", color: "#666" }}>
                {integration.description}
              </p>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background:
                    integration.status === "connected"
                      ? "#dcfce7"
                      : "#fef3c7",
                  color:
                    integration.status === "connected"
                      ? "#166534"
                      : "#92400e",
                }}
              >
                {integration.status === "connected" ? "✓ Connected" : "○ Disconnected"}
              </span>
            </div>

            <button
              onClick={() => handleConnect(integration.id)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background:
                  integration.status === "connected" ? "#f0f0f0" : "#000",
                color:
                  integration.status === "connected" ? "#000" : "#fff",
                border:
                  integration.status === "connected"
                    ? "1px solid #e5e7eb"
                    : "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {integration.action}
            </button>
          </div>
        ))}
      </div>

      {selectedIntegration === "openai" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedIntegration(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>
              Add OpenAI API Key
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                API Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                }}
              />
              <p style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>
                Get your API key from{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc" }}>
                  OpenAI Platform
                </a>
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setSelectedIntegration(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#f0f0f0",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey || saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: apiKey && !saving ? "#000" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: apiKey && !saving ? "pointer" : "not-allowed",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
