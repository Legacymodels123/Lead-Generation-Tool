"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import IntegrationCard from "@/components/IntegrationCard";
import OAuthIntegrationCard from "@/components/OAuthIntegrationCard";
import ColumnConfigCard from "@/components/ColumnConfigCard";

const PROVIDERS = [
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

export default function IntegrationsNewPage() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const error = searchParams.get("error");
    const errorDetail = searchParams.get("error_detail");

    if (oauthSuccess) {
      setMessage(`✓ ${oauthSuccess} verbonden!`);
      showToast(`✓ ${oauthSuccess} succesvol gekoppeld!`);
      setTimeout(() => setMessage(""), 5000);
    } else if (error) {
      const detail = errorDetail ? ` - ${errorDetail}` : "";
      setMessage(`✗ Fout: ${error}${detail}`);
      showToast(`✗ OAuth fout: ${error}`);
      setTimeout(() => setMessage(""), 5000);
    }
  }, [searchParams, showToast]);

  if (!user) return null;

  const OAUTH_PROVIDERS = [
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

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Integraties</span>
        <span className="topbar-sub">— Verbind je API providers</span>
      </div>

      <div className="page-scroll">
        {message && (
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              marginBottom: 16,
              background: message.includes("✓") ? "#dcfce7" : "#fef2f2",
              color: message.includes("✓") ? "#166534" : "#991b1b",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {message}
          </div>
        )}

        <div className="card">
          <div className="card-title">API Providers Configureren</div>
          <div className="card-desc">
            Voeg je eigen API keys toe zodat je alle tools kan gebruiken. Deze keys worden veilig opgeslagen in je workspace.
          </div>
        </div>

        <div className="card">
          <div className="card-title">AI Providers</div>
          <div className="card-desc">Kies je favoriete AI voor lead verrijking</div>
          {PROVIDERS.filter((p) => p.id === "openai" || p.id === "anthropic").map(
            (provider) => (
              <IntegrationCard key={provider.id} provider={provider} />
            )
          )}
        </div>

        <div className="card">
          <div className="card-title">CRM & Data Providers</div>
          <div className="card-desc">Synchroniseer met je CRM en verrijk met contactgegevens</div>
          {PROVIDERS.filter((p) => p.id === "hubspot" || p.id === "lusha").map(
            (provider) => (
              <IntegrationCard key={provider.id} provider={provider} />
            )
          )}
        </div>

        <div className="card">
          <div className="card-title">OAuth Integraties</div>
          <div className="card-desc">
            Veilige verbindingen via OAuth - geen tokens opslaan nodig
          </div>
          {OAUTH_PROVIDERS.map((provider) => (
            <OAuthIntegrationCard key={provider.id} provider={provider} />
          ))}
        </div>

        <div className="card">
          <div className="card-title">Binnenkort</div>
          <div className="card-desc">Deze integraties komen eraan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🔗", name: "LinkedIn", desc: "OAuth login & CSV export" },
              {
                icon: "🔄",
                name: "Zapier",
                desc: "Workflow automatisatie",
              },
              {
                icon: "📊",
                name: "Google Sheets",
                desc: "2-way sync met spreadsheets",
              },
            ].map((item) => (
              <div
                key={item.name}
                style={{
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 6,
                  border: "1px dashed #e5e7eb",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{item.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ColumnConfigCard />

        <div className="card">
          <div className="card-title">Help & Documentatie</div>
          <div className="card-desc">Stap-voor-stap guides voor elke integratie</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: "📖", title: "OpenAI Setup Guide", link: "#" },
              { icon: "📖", title: "HubSpot Private App Token", link: "#" },
              { icon: "🎥", title: "Video: Lead Enrichment Workflow", link: "#" },
            ].map((item) => (
              <a
                key={item.title}
                href={item.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  background: "#f9fafb",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "#0066cc",
                  fontSize: 14,
                }}
              >
                <span>{item.icon}</span>
                {item.title} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
