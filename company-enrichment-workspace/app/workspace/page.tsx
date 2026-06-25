import AppShell from "@/components/app-shell";

const rows = [
  {
    company: "Acme Logistics",
    domain: "acme-logistics.com",
    country: "Netherlands",
    city: "Amsterdam",
    industry: "Logistics",
    employees: "51-200",
    status: "ready",
    summary: "Strong fleet software fit, active expansion signals.",
    fitScore: "84",
    notes: "Needs validation on ERP stack",
    sync: "ready",
  },
  {
    company: "NorthFleet Group",
    domain: "northfleet.io",
    country: "Germany",
    city: "Berlin",
    industry: "Mobility",
    employees: "201-500",
    status: "researching",
    summary: "Claude is generating qualification notes for custom AI properties.",
    fitScore: "71",
    notes: "Hunter verified domain, Lusha pending contacts",
    sync: "not_synced",
  },
];

export default function WorkspacePage() {
  return (
    <AppShell
      title="Workspace"
      description="Dynamic property workspace where imported columns become properties automatically, AI fills selected fields, and HubSpot stays in sync."
    >
      <div className="toolbar">
        <input placeholder="Search company, domain, or property value" />
        <button className="btn-secondary">Import Excel</button>
        <button className="btn-secondary">Add property</button>
        <button className="btn-primary">Run AI enrichment</button>
      </div>

      <section className="workspace">
        <div className="grid-card">
          <table className="grid">
            <thead>
              <tr>
                <th>Company</th>
                <th>Domain</th>
                <th>Country</th>
                <th>City</th>
                <th>Industry</th>
                <th>Employee Range</th>
                <th>Qualification Status</th>
                <th>Research Summary</th>
                <th>Fit Score</th>
                <th>Notes</th>
                <th>Sync Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.company}>
                  <td><input defaultValue={row.company} /></td>
                  <td><input defaultValue={row.domain} /></td>
                  <td><input defaultValue={row.country} /></td>
                  <td><input defaultValue={row.city} /></td>
                  <td><input defaultValue={row.industry} /></td>
                  <td><input defaultValue={row.employees} /></td>
                  <td><input defaultValue={row.status} /></td>
                  <td><textarea defaultValue={row.summary} /></td>
                  <td><input defaultValue={row.fitScore} /></td>
                  <td><textarea defaultValue={row.notes} /></td>
                  <td><input defaultValue={row.sync} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="panel stack">
          <div>
            <div className="eyebrow">Research panel</div>
            <h3>Acme Logistics</h3>
            <p className="muted">Inspect enrichment results, AI properties, notes, and sync state for the selected company row.</p>
          </div>

          <div>
            <span className="badge badge-success">Claude property bot ready</span>
          </div>

          <div>
            <strong>Dynamic properties</strong>
            <p className="muted">
              Imported columns become properties automatically. AI can infer property types,
              suggest dropdowns, and classify fields as static or AI-enriched.
            </p>
          </div>

          <div>
            <strong>Next actions</strong>
            <p className="muted">
              Run property enrichment, refresh HubSpot values, or map this row to CRM properties.
            </p>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
