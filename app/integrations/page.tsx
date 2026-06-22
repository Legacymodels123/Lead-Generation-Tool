"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ConnectionsHub from "@/components/ConnectionsHub";
import IntegrationConnectStrip from "@/components/IntegrationConnectStrip";

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <div className="page-loading">Redirecting…</div>;

  const workspaceId = user.workspaceId ?? "legacy-scale-models";

  return (
    <div className="integrations-page">
      <div className="integrations-page-head">
        <h1>Connections</h1>
        <p>Link AI providers and CRM tools to power your lead workspace.</p>
      </div>
      <IntegrationConnectStrip workspaceId={workspaceId} />
      <ConnectionsHub workspaceId={workspaceId} focusProvider={focus} />
    </div>
  );
}
