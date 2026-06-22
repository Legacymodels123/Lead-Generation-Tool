"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspaceConfig } from "@/lib/types";
import {
  CORE_INTEGRATIONS,
} from "@/lib/integrations/catalog";
import { isIntegrationConnected } from "@/lib/integrations/status";

interface Props {
  config: WorkspaceConfig;
}

export default function IntegrationsOverview({ config }: Props) {
  const aiIds = CORE_INTEGRATIONS.filter((i) => i.section === "ai").map((i) => i.id);
  const crmIds = CORE_INTEGRATIONS.filter((i) => i.section === "crm").map((i) => i.id);
  const mcpCount = config.mcpServers?.filter((s) => s.lastStatus === "ok").length ?? 0;
  const mcpTotal = config.mcpServers?.length ?? 0;

  const aiConnected = aiIds.filter((id) => isIntegrationConnected(config, id)).length;
  const crmConnected = crmIds.filter((id) => isIntegrationConnected(config, id)).length;

  const scrollTo = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="integrations-overview">
      <div className="integrations-overview-intro">
        <h2>How connections work</h2>
        <ul className="integrations-overview-legend">
          <li>
            <span className="integration-method-badge">API key</span>
            Paste a secret key — powers AI columns and enrichment inside the grid.
          </li>
          <li>
            <span className="integration-method-badge oauth">OAuth</span>
            Sign in to HubSpot or LinkedIn — no manual token copy when configured.
          </li>
          <li>
            <span className="integration-method-badge mcp">MCP</span>
            Agent tool servers — lets automations act in external apps (separate setup).
          </li>
        </ul>
      </div>

      <div className="integrations-overview-stats">
        <button type="button" className="integrations-stat-card" onClick={() => scrollTo("section-ai")}>
          <span className="integrations-stat-label">AI providers</span>
          <span className="integrations-stat-value">
            {aiConnected}/{aiIds.length}
          </span>
          <span className="integrations-stat-hint">
            {aiConnected ? "Ready for AI columns" : "Connect at least one"}
          </span>
        </button>
        <button type="button" className="integrations-stat-card" onClick={() => scrollTo("section-crm")}>
          <span className="integrations-stat-label">CRM & social</span>
          <span className="integrations-stat-value">
            {crmConnected}/{crmIds.length}
          </span>
          <span className="integrations-stat-hint">
            {crmConnected ? "Sync enabled" : "Optional for HubSpot / LinkedIn"}
          </span>
        </button>
        <button type="button" className="integrations-stat-card" onClick={() => scrollTo("mcp")}>
          <span className="integrations-stat-label">MCP tools</span>
          <span className="integrations-stat-value">{mcpTotal}</span>
          <span className="integrations-stat-hint">
            {mcpCount ? `${mcpCount} live` : "Optional agent connections"}
          </span>
        </button>
      </div>
    </div>
  );
}

/** Shared status strip for toolbar — compact connection summary */
export function useIntegrationStatus(workspaceId: string) {
  const [status, setStatus] = useState({ ai: 0, crm: 0, mcp: 0 });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`);
      if (!res.ok) return;
      const data = (await res.json()) as WorkspaceConfig;
      const ai = ["openai", "anthropic"].filter((id) => isIntegrationConnected(data, id)).length;
      const crm = ["hubspot", "linkedin"].filter((id) => isIntegrationConnected(data, id)).length;
      setStatus({
        ai,
        crm,
        mcp: data.mcpServers?.length ?? 0,
      });
    } catch {
      /* ignore */
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, reload: load };
}
