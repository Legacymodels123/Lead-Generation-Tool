"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ConnectionsHub from "@/components/ConnectionsHub";

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <div className="page-loading">Redirecting…</div>;

  const workspaceId = user.workspaceId ?? "legacy-scale-models";

  return (
    <div className="integrations-page">
      <header className="integrations-page-head">
        <h1>Integrations</h1>
        <p>
          Connect your workspace in four steps: AI for smart columns, CRM for sync, enrichment APIs
          for data, and MCP for agent actions.
        </p>
      </header>
      <ConnectionsHub workspaceId={workspaceId} focusProvider={focus} />
    </div>
  );
}
