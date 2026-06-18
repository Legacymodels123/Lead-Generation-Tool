"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { fetchServiceStatus, syncUserSettingsCloud } from "@/lib/data/leads-client";
import { LEGACY_SCALE_MODELS_ICP } from "@/lib/icp/legacy-scale-models";
import type { Integrations } from "@/lib/types";
import {
  DEFAULT_USER_SETTINGS,
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from "@/lib/user-settings";

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
    description: "Ontvang notificaties bij leads, batches en automations",
  },
  {
    key: "nightlyAgent",
    title: "Nightly AI Agent",
    description: "Automatische verrijking elke nacht om 02:00 (Vercel Cron)",
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { updateIntegrations, storageMode, showToast } = useApp();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [serviceStatus, setServiceStatus] = useState({
    cloud: false,
    ai: false,
    openai: false,
    anthropic: false,
    aiProvider: null as "openai" | "anthropic" | null,
    supabasePublic: false,
    hubspot: false,
    supabaseAuth: false,
    instantly: false,
    missingEnv: [] as string[],
  });

  useEffect(() => {
    if (user) setSettings(loadUserSettings(user.id));
  }, [user?.id]);

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
          instantly: (s as { instantly?: boolean }).instantly ?? false,
          missingEnv: s.missingEnv ?? [],
        })
      )
      .catch(() => {});
    fetch("/api/integrations/instantly")
      .then((r) => r.json())
      .then((d) => setServiceStatus((prev) => ({ ...prev, instantly: Boolean(d.configured) })))
      .catch(() => {});
  }, []);

  if (!user) return null;

  function toggle(key: keyof Integrations) {
    updateIntegrations({
      ...user!.integrations,
      [key]: !user!.integrations[key],
    });
  }

  function persistSettings(next: UserSettings) {
    setSettings(next);
    saveUserSettings(user!.id, next);
    syncUserSettingsCloud(user!.id, {
      ...next,
      nightlyAgent: user!.integrations.nightlyAgent,
    });
    showToast("Instellingen opgeslagen");
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
            { label: "Instantly", ok: serviceStatus.instantly },
            { label: "Hunter.io", ok: Boolean(process.env.NEXT_PUBLIC_HUNTER_HINT) },
          ]
            .filter((item) => item.label !== "Hunter.io")
            .map((item) => (
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
          {!serviceStatus.cloud && serviceStatus.missingEnv.length > 0 && (
            <p className="card-desc" style={{ marginTop: 8, color: "#92400e" }}>
              Cloud uitgeschakeld — ontbrekende Vercel env vars:{" "}
              {serviceStatus.missingEnv.join(", ")}. Voeg ze toe en redeploy.
            </p>
          )}
          {!serviceStatus.hubspot && (
            <p className="card-desc" style={{ marginTop: 8, color: "#92400e" }}>
              Voeg <code>HUBSPOT_ACCESS_TOKEN</code> toe voor CRM sync.
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-title">Outbound integraties</div>
          <div className="setting-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="setting-info" style={{ marginBottom: 8 }}>
              <h4>Webhook URL</h4>
              <p>POST JSON bij lead.created, batch.imported, automation.completed</p>
            </div>
            <input
              className="settings-input"
              type="url"
              placeholder="https://hooks.example.com/leadgen"
              value={settings.webhookUrl ?? ""}
              onChange={(e) => persistSettings({ ...settings, webhookUrl: e.target.value })}
            />
          </div>
          <div className="setting-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="setting-info" style={{ marginBottom: 8 }}>
              <h4>Instantly campaign ID</h4>
              <p>Push geselecteerde leads met e-mail naar Instantly</p>
            </div>
            <input
              className="settings-input"
              placeholder="campaign-uuid"
              value={settings.instantlyCampaignId ?? ""}
              onChange={(e) =>
                persistSettings({ ...settings, instantlyCampaignId: e.target.value })
              }
            />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>Auto-pipeline na LinkedIn import</h4>
              <p>Verrijk → score → AI kolommen na elke CSV import</p>
            </div>
            <button
              type="button"
              className={`toggle${settings.autoImportPipeline ? " on" : ""}`}
              onClick={() =>
                persistSettings({
                  ...settings,
                  autoImportPipeline: !settings.autoImportPipeline,
                })
              }
            />
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>HubSpot timeline notities</h4>
              <p>Log AI samenvatting als notitie bij sync</p>
            </div>
            <button
              type="button"
              className={`toggle${settings.hubspotTimelineNotes ? " on" : ""}`}
              onClick={() =>
                persistSettings({
                  ...settings,
                  hubspotTimelineNotes: !settings.hubspotTimelineNotes,
                })
              }
            />
          </div>
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
