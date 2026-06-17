"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

const AUTOMATION_TEMPLATES = [
  {
    id: "ai-qualify",
    name: "AI Lead Qualification",
    description: "Automatically qualify leads using ChatGPT analysis",
    icon: "🤖",
    enabled: false,
    config: {
      lookback: 7,
      batchSize: 10,
      minScoreThreshold: 0.7,
    },
  },
  {
    id: "ai-message",
    name: "AI Message Generation",
    description: "Generate personalized outreach messages using AI",
    icon: "💬",
    enabled: false,
    config: {
      tone: "professional",
      includeCompanyResearch: true,
      maxLength: 200,
    },
  },
  {
    id: "hubspot-sync",
    name: "HubSpot Sync",
    description: "Automatically sync qualified leads to HubSpot CRM",
    icon: "🔄",
    enabled: false,
    config: {
      autoSync: true,
      syncFrequency: "daily",
      createDeals: true,
    },
  },
  {
    id: "email-tracking",
    name: "Email Tracking",
    description: "Track email opens and clicks for outreach",
    icon: "📧",
    enabled: false,
    config: {
      trackOpens: true,
      trackClicks: true,
      sendRecaps: true,
    },
  },
  {
    id: "linkedin-outreach",
    name: "LinkedIn Outreach",
    description: "Manage LinkedIn connection requests and messages",
    icon: "🔗",
    enabled: false,
    config: {
      dailyLimit: 20,
      waitBetweenRequests: 3600,
      templateBased: true,
    },
  },
  {
    id: "batch-enrichment",
    name: "Nightly Enrichment",
    description: "Automatically enrich leads every night with new data",
    icon: "✨",
    enabled: false,
    config: {
      schedule: "23:00",
      enrichmentFields: ["emails", "phone", "linkedin"],
      maxLeadsPerNight: 50,
    },
  },
];

export default function AutomationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useApp();
  const [automations, setAutomations] = useState(AUTOMATION_TEMPLATES);
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const toggleAutomation = (id: string) => {
    setAutomations(
      automations.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      )
    );
    const automation = automations.find((a) => a.id === id);
    if (automation) {
      showToast(
        automation.enabled
          ? `✓ ${automation.name} disabled`
          : `✓ ${automation.name} enabled`
      );
    }
  };

  const openConfig = (id: string) => {
    setSelectedAutomation(selectedAutomation === id ? null : id);
  };

  const selectedAuto = automations.find((a) => a.id === selectedAutomation);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
          Automations
        </h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          Set up intelligent automations to streamline your lead workflow
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ padding: "8px 12px", background: "#f0f0f0", borderRadius: "6px", fontSize: "12px" }}>
            {automations.filter((a) => a.enabled).length} active automation
            {automations.filter((a) => a.enabled).length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {automations.map((automation) => (
          <div
            key={automation.id}
            style={{
              padding: "16px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: automation.enabled ? "#f0f9ff" : "#fff",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ fontSize: "32px" }}>{automation.icon}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                  {automation.name}
                </h3>
                <p style={{ fontSize: "12px", color: "#666" }}>
                  {automation.description}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => toggleAutomation(automation.id)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: automation.enabled ? "#000" : "#f0f0f0",
                  color: automation.enabled ? "#fff" : "#000",
                  border: automation.enabled ? "none" : "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {automation.enabled ? "✓ Enabled" : "Enable"}
              </button>
              <button
                onClick={() => openConfig(automation.id)}
                style={{
                  padding: "8px 12px",
                  background: "#f0f0f0",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⚙️
              </button>
            </div>

            {selectedAutomation === automation.id && (
              <div
                style={{
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  fontSize: "12px",
                  borderLeft: "3px solid #0066cc",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>Configuration</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(automation.config).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#666", textTransform: "capitalize" }}>
                        {key.replace(/([A-Z])/g, " $1")}:
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#f0f9ff",
          border: "1px solid #bfdbfe",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#0c4a6e",
        }}
      >
        💡 <strong>Tip:</strong> Connect your integrations in the Integrations tab to unlock
        more automation options. Your automations will run in the background to keep your leads
        up-to-date.
      </div>
    </div>
  );
}
