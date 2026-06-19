import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceEnrichmentClient from "@/components/workspace/WorkspaceEnrichmentClient";

export default function WorkspaceEnrichmentPage() {
  return (
    <WorkspaceShell
      title="Enrichment Jobs"
      subtitle="Track AI enrichment runs per lead. Mock provider is active until real APIs are connected."
    >
      <WorkspaceEnrichmentClient />
    </WorkspaceShell>
  );
}
