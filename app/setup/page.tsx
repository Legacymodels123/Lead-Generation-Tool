"use client";

import { useAuth } from "@/lib/auth";
import { ResearchWorkspaceProvider } from "@/lib/research-workspace";
import ResearchShell from "@/components/research/ResearchShell";
import ConnectionsHub from "@/components/ConnectionsHub";

function SetupContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="research-loading-state">Loading setup...</div>;
  }

  return (
    <ResearchShell
      title="Setup"
      description="Connect only what this workspace needs: AI for research summaries, data providers for enrichment, and HubSpot for qualified sync."
    >
      <div className="research-setup-stack">
        <section className="research-info-card">
          <h2>What to connect first</h2>
          <ol className="research-setup-list">
            <li>Connect one AI provider so research runs can generate summaries and fit reasoning.</li>
            <li>Connect HubSpot if you want qualified company rows to sync outward.</li>
            <li>Add enrichment providers only if you want broader company/contact coverage.</li>
          </ol>
        </section>

        <ConnectionsHub workspaceId={user?.workspaceId ?? "legacy-scale-models"} />
      </div>
    </ResearchShell>
  );
}

export default function SetupPage() {
  return (
    <ResearchWorkspaceProvider>
      <SetupContent />
    </ResearchWorkspaceProvider>
  );
}
