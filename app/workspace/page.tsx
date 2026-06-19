import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceLeadsClient from "@/components/workspace/WorkspaceLeadsClient";

export default function WorkspacePage() {
  return (
    <WorkspaceShell
      title="Leads"
      subtitle="Manage, enrich and validate B2B fleet leads in an editable workspace."
    >
      <WorkspaceLeadsClient />
    </WorkspaceShell>
  );
}
