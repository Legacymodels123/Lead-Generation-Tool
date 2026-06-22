"use client";

import { useRouter } from "next/navigation";
import { useIntegrationStatus } from "@/components/IntegrationsOverview";

interface Props {
  workspaceId: string;
  compact?: boolean;
}

export default function IntegrationConnectStrip({ workspaceId, compact = true }: Props) {
  const router = useRouter();
  const { status } = useIntegrationStatus(workspaceId);

  const aiReady = status.ai > 0;
  const label = compact
    ? undefined
    : "Manage all connections";

  return (
    <div className={`integration-strip${compact ? " integration-strip-compact" : ""}`}>
      <button
        type="button"
        className={`integration-status-pill${aiReady ? " ready" : ""}`}
        onClick={() => router.push("/integrations#section-ai")}
        title="AI providers — required for AI columns"
      >
        <span className="integration-status-dot" />
        AI {status.ai}/2
      </button>
      <button
        type="button"
        className={`integration-status-pill${status.crm > 0 ? " ready" : ""}`}
        onClick={() => router.push("/integrations#section-crm")}
        title="HubSpot & LinkedIn"
      >
        <span className="integration-status-dot" />
        CRM {status.crm}/2
      </button>
      <button
        type="button"
        className={`integration-status-pill${status.mcp > 0 ? " ready" : ""}`}
        onClick={() => router.push("/integrations#mcp")}
        title="MCP agent tool servers"
      >
        <span className="integration-status-dot" />
        MCP {status.mcp}
      </button>
      {!compact && (
        <button
          type="button"
          className="integration-manage-link"
          onClick={() => router.push("/integrations")}
        >
          {label}
        </button>
      )}
    </div>
  );
}
