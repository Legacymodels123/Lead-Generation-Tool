"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ConnectionsHub from "@/components/ConnectionsHub";

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const workspaceId = user.workspaceId ?? "legacy-scale-models";

  return (
    <div className="integrations-page">
      <div className="integrations-page-head">
        <h1>Integrations</h1>
        <p>Connect API keys and MCP servers for your workspace.</p>
      </div>
      <ConnectionsHub workspaceId={workspaceId} />
    </div>
  );
}
