"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { fetchServiceStatus } from "@/lib/data/leads-client";
import { LEGACY_SCALE_MODELS_ICP } from "@/lib/icp/legacy-scale-models";
import type { Integrations } from "@/lib/types";

const INTEGRATIONS: {
  key: keyof Integrations;
  title: string;
  description: string;
}[] = [
  {
    key: "linkedin",
    title: "LinkedIn Sales Navigator",
    description: "Importeer leads via CSV export uit Sales Navigator",
  },
  {
    key: "crm",
    title: "HubSpot CRM",
    description: "Synchroniseer accounts + DMU contacten naar HubSpot",
  },
  {
    key: "webhooks",
    title: "Webhooks",
    description: "Ontvang notificaties bij nieuwe batches",
  },
  {
    key: "nightlyAgent",
    title: "Nightly AI Agent",
    description: "Automatische verrijking elke nacht om 02:00 (Vercel Cron)",
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { updateIntegrations, storageMode } = useApp();
  const [serviceStatus, setServiceStatus] = useState({
    cloud: false,
    ai: false,
    openai: false,
    anthropic: false,
    aiProvider: null as "openai" | "anthropic" | null,
    supabasePublic: false,
    hubspot: false,
    supabaseAuth: false,
  });

  useEffect(() => {
    fetchServiceStatus()
      .then((s) =>
        setServiceStatus({
          cloud: s.cloud,
          ai: s.ai,
          openai: s.openai,
          anthropic: s.anthropic,
          aiProvider: s.aiProvider,
          supabasePublic: s.supabasePublic,
          hubspot: s.hubspot ?? false,
          supabaseAuth: s.supabaseAuth ?? false,
        })
      )
      .catch(() => {});
  }, []);

  if (!user) return null;

  function toggle(key: keyof Integrations) {
    updateIntegrations({
      ...user!.integrations,
      [key]: !user!.integrations[key],
    });
  }

  const icp = LEGACY_SCALE_MODELS_ICP;

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Integraties</span>
        <span className="topbar-sub">— Koppel externe tools</span>
      </div>
      <div className="page-scroll">
        <div className="card">
          <div className="card-title">Systeemstatus</div>
          <div className="card-desc">
            Server-side configuratie. Client opslag:{" "}
            {storageMode === "cloud"
              ? "☁️ Cloud"
              : storageMode === "local"
                ? "💾 Lokaal"
                : "…"}
          </div>
          {[
            { label: "Supabase Cloud", ok: serviceStatus.cloud },
            { label: "Supabase Auth", ok: serviceStatus.supabaseAuth },
            { label: "OpenAI", ok: serviceStatus.openai },
            { label: "Claude AI", ok: serviceStatus.anthropic },
            { label: "HubSpot CRM", ok: serviceStatus.hubspot },
          ].map((item) => (
            <div key={item.label} className="setting-row">
              <div className="setting-info">
                <h4>{item.label}</h4>
              </div>
              <span className={`status-pill ${item.ok ? "s-gewonnen" : "s-verloren"}`}>
                {item.ok ? "Geconfigureerd" : "Niet actief"}
              </span>
            </div>
          ))}
          {serviceStatus.ai && serviceStatus.aiProvider && (
            <p className="card-desc" style={{ marginTop: 8, color: "#166534" }}>
              Actieve AI provider:{" "}
              {serviceStatus.aiProvider === "openai" ? "OpenAI" : "Claude (Anthropic)"}
            </p>
          )}
          {!serviceStatus.hubspot && (
            <p className="card-desc" style={{ marginTop: 8, color: "#92400e" }}>
              Voeg <code>HUBSPOT_ACCESS_TOKEN</code> toe voor CRM sync.
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-title">Workspace — {icp.name}</div>
          <div className="card-desc">{icp.companyDescription}</div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>Doelmarkten</h4>
              <p>{icp.markets.map((m) => m.label).join(" · ")}</p>
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>DMU rollen</h4>
              <p>Marketing / Brand Manager · CEO / Owner</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Actieve integraties</div>
          <div className="card-desc">
            Schakel integraties in of uit. HubSpot sync vereist{" "}
            <code>HUBSPOT_ACCESS_TOKEN</code> in env vars.
          </div>
          {INTEGRATIONS.map((item) => (
            <div key={item.key} className="setting-row">
              <div className="setting-info">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
              <button
                type="button"
                className={`toggle${user.integrations[item.key] ? " on" : ""}`}
                onClick={() => toggle(item.key)}
                aria-label={`Toggle ${item.title}`}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
