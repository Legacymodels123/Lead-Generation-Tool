"use client";

import { useEffect, useState } from "react";
import { useWorkspaceFetch } from "@/lib/workspace/fetch";

interface JobRow {
  id: string;
  status: string;
  provider: string;
  created_at: string;
  completed_at: string | null;
  workspace_leads?: { company_name?: string };
  result?: Record<string, unknown>;
}

export default function WorkspaceEnrichmentClient() {
  const fetchApi = useWorkspaceFetch();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi("/api/workspace/enrichment-jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchApi]);

  if (loading) return <div className="ws-loading">Loading jobs…</div>;

  return (
    <div className="ws-panel">
      <table className="ws-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Created</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={5} className="ws-muted">
                No enrichment jobs yet. Use &quot;Enrich Lead&quot; on the Leads grid.
              </td>
            </tr>
          ) : (
            jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.workspace_leads?.company_name ?? "—"}</td>
                <td>
                  <span className={`ws-pill ws-pill-${j.status}`}>{j.status}</span>
                </td>
                <td>{j.provider}</td>
                <td>{new Date(j.created_at).toLocaleString()}</td>
                <td>{j.completed_at ? new Date(j.completed_at).toLocaleString() : "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
