import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default function WorkspaceSettingsPage() {
  return (
    <WorkspaceShell title="Settings" subtitle="Workspace configuration and enrichment providers.">
      <div className="ws-panel">
        <section className="ws-settings-block">
          <h2>Enrichment providers</h2>
          <p className="ws-muted">
            The workspace uses a mock enrichment API at{" "}
            <code className="ws-code">/api/workspace/enrich/[id]</code>. Connect OpenAI, Claude, or
            custom fleet data sources in that route when ready.
          </p>
        </section>
        <section className="ws-settings-block">
          <h2>Database</h2>
          <p className="ws-muted">
            Run <code className="ws-code">supabase/migrations/20240619_ag_grid_workspace.sql</code> in
            your Supabase project to create workspace_leads, enrichment jobs, evidence sources, and
            audit tables.
          </p>
        </section>
        <section className="ws-settings-block">
          <h2>Required fields</h2>
          <p className="ws-muted">company_name, domain, and status must be filled before a lead is valid.</p>
        </section>
      </div>
    </WorkspaceShell>
  );
}
