"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import {
  fetchWorkspaceConfig,
  updateWorkspaceConfig,
  clearConfigCache,
} from "@/lib/workspace/config";
import type { WorkspaceConfig } from "@/lib/types";

interface Provider {
  id: string;
  name: string;
  description: string;
  icon: string;
  keyField: string;
  placeholder: string;
  helpText: string;
  testEndpoint?: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Voor GPT-4 AI verrijking van leads",
    icon: "🟢",
    keyField: "openai",
    placeholder: "sk-...",
    helpText: "Je OpenAI API key van https://platform.openai.com/api-keys",
    testEndpoint: "/api/integrations/test/openai",
  },
  {
    id: "anthropic",
    name: "Claude (Anthropic)",
    description: "Voor Claude AI verrijking van leads",
    icon: "🧠",
    keyField: "anthropic",
    placeholder: "sk-ant-...",
    helpText: "Je Anthropic API key van https://console.anthropic.com",
    testEndpoint: "/api/integrations/test/anthropic",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM synchronisatie & contact management",
    icon: "🔵",
    keyField: "hubspot",
    placeholder: "pat-...",
    helpText: "HubSpot Private App token van https://app.hubspot.com/settings/apps",
    testEndpoint: "/api/integrations/test/hubspot",
  },
  {
    id: "lusha",
    name: "Lusha",
    description: "Contactgegevens verrijking (email, telefoon)",
    icon: "📧",
    keyField: "lusha",
    placeholder: "lu_...",
    helpText: "Lusha API key van https://console.lusha.co",
    testEndpoint: "/api/integrations/test/lusha",
  },
];

interface Props {
  provider: Provider;
}

export default function IntegrationCard({ provider }: Props) {
  const { workspaceId } = useApp();
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadKey();
  }, [workspaceId]);

  async function loadKey() {
    const config = await fetchWorkspaceConfig(workspaceId);
    const key = config.apiKeys?.[provider.keyField as keyof typeof config.apiKeys];
    if (key) {
      setApiKey("••••" + key.slice(-4));
      setIsConfigured(true);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      // Only send if not masked (i.e., new value entered)
      if (apiKey && !apiKey.startsWith("••••")) {
        await updateWorkspaceConfig(workspaceId, {
          apiKeys: {
            [provider.keyField]: apiKey,
          },
        });
        clearConfigCache(workspaceId);
        setApiKey("••••" + apiKey.slice(-4));
        setIsConfigured(true);
        setMessage("✓ " + provider.name + " geconfigureerd");
      } else if (!apiKey && isConfigured) {
        setMessage("Geen wijzigingen opgeslagen");
      } else {
        setMessage("✓ Opgeslagen");
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Fout: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!isConfigured) {
      setTestResult("Configureer eerst de API key");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(provider.testEndpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult("✓ Verbinding succesvol!");
      } else {
        const data = await response.json();
        setTestResult(
          "✗ " + (data.error || "Verbinding mislukt, controleer je key")
        );
      }
    } catch (err) {
      setTestResult("✗ Fout bij testen: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Zeker dat je deze integratie wilt verwijderen?")) return;

    setSaving(true);
    try {
      await updateWorkspaceConfig(workspaceId, {
        apiKeys: {
          [provider.keyField]: undefined,
        },
      });
      clearConfigCache(workspaceId);
      setApiKey("");
      setIsConfigured(false);
      setMessage("✓ Integratie verwijderd");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Fout: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginBottom: 12,
        background: isConfigured ? "#f0fdf4" : "#fafafa",
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
            background: isConfigured ? "#dcfce7" : "#f3f4f6",
            color: isConfigured ? "#166534" : "#6b7280",
          }}
        >
          {isConfigured ? "✓ Geconfigureerd" : "○ Niet geconfigureerd"}
        </span>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
            API Key / Token
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="password"
              className="form-input"
              placeholder={provider.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: 1, padding: "8px 12px" }}
            />
            {isConfigured && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRemove}
                disabled={saving}
                style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
              >
                Verwijder
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {provider.helpText}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ padding: "8px 12px", fontSize: 13 }}
          >
            {saving ? "Opslaan..." : "Opslaan"}
          </button>

          {isConfigured && provider.testEndpoint && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
              disabled={testing}
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              {testing ? "Testen..." : "Test"}
            </button>
          )}
        </div>

        {message && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: message.includes("✓") ? "#166534" : "#991b1b",
            }}
          >
            {message}
          </p>
        )}

        {testResult && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: testResult.includes("✓") ? "#166534" : "#991b1b",
              padding: 8,
              background: testResult.includes("✓") ? "#f0fdf4" : "#fef2f2",
              borderRadius: 4,
            }}
          >
            {testResult}
          </p>
        )}
      </form>
    </div>
  );
}
