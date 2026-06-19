"use client";

import { useState } from "react";
import { useWorkspaceFetch } from "@/lib/workspace/fetch";
import Link from "next/link";

export default function WorkspaceImportsClient() {
  const fetchApi = useWorkspaceFetch();
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const onFile = async (file: File) => {
    setImporting(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetchApi("/api/workspace/leads/import", { method: "POST", body: form });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setStatus(`Successfully imported ${data.imported} leads.`);
    } catch {
      setStatus("Import failed. Check your CSV format and try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="ws-panel">
      <div className="ws-dropzone">
        <p className="ws-dropzone-title">Drop a CSV file or browse</p>
        <p className="ws-dropzone-hint">
          Columns: company_name, domain, segment, fleet_brand, fleet_type, confidence, lead_fit,
          status, owner, next_action, notes
        </p>
        <label className="ws-btn ws-btn-primary">
          {importing ? "Importing…" : "Choose CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {status && <p className="ws-status-line">{status}</p>}
      <p className="ws-muted">
        After import, open{" "}
        <Link href="/workspace" className="ws-inline-link">
          Leads
        </Link>{" "}
        to review and enrich records.
      </p>
    </div>
  );
}
