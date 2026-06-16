"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import {
  fetchWorkspaceConfig,
  updateWorkspaceConfig,
  clearConfigCache,
} from "@/lib/workspace/config";
import type { WorkspaceConfig } from "@/lib/types";

export default function ApiKeysCard() {
  const { workspaceId } = useApp();
  const [config, setConfig] = useState<WorkspaceConfig>({});
  const [openai, setOpenai] = useState("");
  const [hubspot, setHubspot] = useState("");
  const [lusha, setLusha] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadConfig();
  }, [workspaceId]);

  async function loadConfig() {
    const cfg = await fetchWorkspaceConfig(workspaceId);
    setConfig(cfg);
    setOpenai(cfg.apiKeys?.openai ? "••••" + cfg.apiKeys.openai.slice(-4) : "");
    setHubspot(cfg.apiKeys?.hubspot ? "••••" + cfg.apiKeys.hubspot.slice(-4) : "");
    setLusha(cfg.apiKeys?.lusha ? "••••" + cfg.apiKeys.lusha.slice(-4) : "");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      // Only send non-masked values (new entries or changed)
      const updates: WorkspaceConfig = {
        apiKeys: {},
      };

      if (openai && !openai.startsWith("••••")) {
        updates.apiKeys!.openai = openai;
      }
      if (hubspot && !hubspot.startsWith("••••")) {
        updates.apiKeys!.hubspot = hubspot;
      }
      if (lusha && !lusha.startsWith("••••")) {
        updates.apiKeys!.lusha = lusha;
      }

      if (
        Object.keys(updates.apiKeys!).length === 0 &&
        !Object.keys(updates).some((k) => k !== "apiKeys")
      ) {
        setMessage("Geen wijzigingen opgeslagen");
        setSaving(false);
        return;
      }

      await updateWorkspaceConfig(workspaceId, updates);
      clearConfigCache(workspaceId);

      // Reload to show masked values
      await loadConfig();
      setMessage("✓ API sleutels opgeslagen");

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(
        "✗ Fout bij opslaan: " + (err instanceof Error ? err.message : "Unknown")
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClear(field: "openai" | "hubspot" | "lusha") {
    if (field === "openai") setOpenai("");
    if (field === "hubspot") setHubspot("");
    if (field === "lusha") setLusha("");
  }

  return (
    <div className="card">
      <div className="card-title">API Sleutels & Integraties</div>
      <div className="card-desc">
        Beheer API sleutels voor AI, HubSpot en verrijkingsdiensten
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">OpenAI API Key</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-input"
              type="password"
              placeholder="sk-..."
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
              style={{ flex: 1 }}
            />
            {openai && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleClear("openai")}
                style={{ padding: "8px 16px" }}
              >
                Verwijder
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            Voor GPT-4o-mini AI verrijking
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">HubSpot Access Token</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-input"
              type="password"
              placeholder="pat-..."
              value={hubspot}
              onChange={(e) => setHubspot(e.target.value)}
              style={{ flex: 1 }}
            />
            {hubspot && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleClear("hubspot")}
                style={{ padding: "8px 16px" }}
              >
                Verwijder
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            Private App token voor CRM sync
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Lusha API Key (optioneel)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-input"
              type="password"
              placeholder="lu_..."
              value={lusha}
              onChange={(e) => setLusha(e.target.value)}
              style={{ flex: 1 }}
            />
            {lusha && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleClear("lusha")}
                style={{ padding: "8px 16px" }}
              >
                Verwijder
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            Voor contactgegevens verrijking
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ marginTop: 16 }}
        >
          {saving ? "Opslaan..." : "Sleutels opslaan"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 12,
              color: message.includes("✓") ? "#16a34a" : "#dc2626",
              fontSize: 13,
            }}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
