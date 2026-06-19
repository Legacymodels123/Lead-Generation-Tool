import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceImportsClient from "@/components/workspace/WorkspaceImportsClient";

export default function WorkspaceImportsPage() {
  return (
    <WorkspaceShell
      title="Imports"
      subtitle="Upload CSV files to bulk-create leads in your workspace."
    >
      <WorkspaceImportsClient />
    </WorkspaceShell>
  );
}
