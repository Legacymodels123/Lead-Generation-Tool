"use client";

import { useAuth } from "@/lib/auth";
import { ResearchWorkspaceProvider } from "@/lib/research-workspace";
import ResearchShell from "@/components/research/ResearchShell";
import WorkspaceGrid from "@/components/research/WorkspaceGrid";

function WorkspaceContent() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="research-loading-state">Loading workspace...</div>;
  }

  return (
    <ResearchShell
      title="Workspace"
      description="Review, research, enrich, qualify, and sync company rows from one spreadsheet-first surface."
    >
      <WorkspaceGrid />
    </ResearchShell>
  );
}

export default function WorkspacePage() {
  return (
    <ResearchWorkspaceProvider>
      <WorkspaceContent />
    </ResearchWorkspaceProvider>
  );
}
