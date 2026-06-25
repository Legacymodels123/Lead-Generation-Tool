"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ResearchWorkspaceProvider } from "@/lib/research-workspace";
import ResearchShell from "@/components/research/ResearchShell";

function SettingsContent() {
  const { user, loading } = useAuth();
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  if (loading) {
    return <div className="research-loading-state">Loading settings...</div>;
  }

  return (
    <ResearchShell
      title="Settings"
      description="Minimal runtime settings for a single-operator research workspace."
    >
      <div className="research-settings-grid">
        <section className="research-info-card">
          <h2>Account</h2>
          <div className="research-kv-list">
            <div><span>Name</span><strong>{user?.name}</strong></div>
            <div><span>Email</span><strong>{user?.email}</strong></div>
            <div><span>Company</span><strong>{user?.company}</strong></div>
            <div><span>Workspace</span><strong>{user?.workspaceId ?? "legacy-scale-models"}</strong></div>
          </div>
        </section>

        <section className="research-info-card">
          <h2>Data handling</h2>
          <p>This v1 tool keeps settings intentionally small. Row editing, research, and sync happen in the workspace itself.</p>
          <button
            type="button"
            className="research-secondary-btn"
            disabled={downloadingBackup}
            onClick={() => {
              setDownloadingBackup(true);
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      user,
                      exportedAt: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                ],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `research-workspace-backup-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              setDownloadingBackup(false);
            }}
          >
            {downloadingBackup ? "Preparing..." : "Download backup"}
          </button>
        </section>
      </div>
    </ResearchShell>
  );
}

export default function SettingsPage() {
  return (
    <ResearchWorkspaceProvider>
      <SettingsContent />
    </ResearchWorkspaceProvider>
  );
}
