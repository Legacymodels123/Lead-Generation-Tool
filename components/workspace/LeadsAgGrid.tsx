"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useWorkspaceFetch } from "@/lib/workspace/fetch";
import {
  CONFIDENCE_LEVELS,
  LEAD_FIT_LEVELS,
  LEAD_STATUSES,
  REQUIRED_FIELDS,
  SEGMENT_OPTIONS,
} from "@/lib/workspace/constants";
import { isFieldMissing } from "@/lib/workspace/validation";
import type { WorkspaceLead } from "@/lib/workspace/types";

ModuleRegistry.registerModules([AllCommunityModule]);

function EnrichButtonRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const [loading, setLoading] = useState(false);
  const fetchApi = useWorkspaceFetch();

  const enrich = async () => {
    if (!params.data?.id) return;
    setLoading(true);
    try {
      const res = await fetchApi(`/api/workspace/enrich/${params.data.id}`, {
        method: "POST",
        body: JSON.stringify({
          company_name: params.data.company_name,
          domain: params.data.domain,
        }),
      });
      if (!res.ok) throw new Error("Enrichment failed");
      const data = await res.json();
      params.context?.onLeadUpdated?.(data.lead);
    } catch (e) {
      console.error(e);
      params.context?.onError?.("Could not enrich lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="ws-enrich-btn"
      onClick={enrich}
      disabled={loading || !params.data?.id}
    >
      {loading ? "…" : "Enrich Lead"}
    </button>
  );
}

function ValidationRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const errors = params.data?.validation_errors ?? [];
  if (!errors.length) return <span className="ws-valid-ok">Valid</span>;
  return (
    <span className="ws-valid-errors" title={errors.join("\n")}>
      {errors.length} issue{errors.length > 1 ? "s" : ""}
    </span>
  );
}

interface Props {
  onCountChange?: (n: number) => void;
}

export default function LeadsAgGrid({ onCountChange }: Props) {
  const gridRef = useRef<AgGridReact<WorkspaceLead>>(null);
  const fetchApi = useWorkspaceFetch();
  const [rowData, setRowData] = useState<WorkspaceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/api/workspace/leads");
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json();
      setRowData(data.leads ?? []);
      onCountChange?.(data.leads?.length ?? 0);
    } catch (e) {
      console.error(e);
      setMessage("Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [fetchApi, onCountChange]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const onLeadUpdated = useCallback((lead: WorkspaceLead) => {
    setRowData((prev) => prev.map((r) => (r.id === lead.id ? lead : r)));
    gridRef.current?.api?.refreshCells({ force: true });
  }, []);

  const gridContext = useMemo(
    () => ({
      onLeadUpdated,
      onError: (msg: string) => setMessage(msg),
    }),
    [onLeadUpdated]
  );

  const missingClassRule = (field: string) => ({
    "ws-cell-missing": (p: { data?: WorkspaceLead }) =>
      p.data ? isFieldMissing(p.data, field) : false,
  });

  const columnDefs = useMemo<ColDef<WorkspaceLead>[]>(
    () => [
      {
        headerName: "",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 48,
        pinned: "left",
        lockPosition: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
      },
      {
        field: "company_name",
        headerName: "Company",
        editable: true,
        minWidth: 180,
        cellClassRules: missingClassRule("company_name"),
      },
      {
        field: "domain",
        headerName: "Domain",
        editable: true,
        minWidth: 140,
        cellClassRules: missingClassRule("domain"),
      },
      {
        field: "segment",
        headerName: "Segment",
        editable: true,
        minWidth: 140,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: SEGMENT_OPTIONS },
      },
      { field: "fleet_brand", headerName: "Fleet Brand", editable: true, minWidth: 130 },
      { field: "fleet_type", headerName: "Fleet Type", editable: true, minWidth: 130 },
      {
        field: "evidence_summary",
        headerName: "Evidence Summary",
        editable: true,
        minWidth: 220,
        flex: 1,
      },
      { field: "evidence_url", headerName: "Evidence URL", editable: true, minWidth: 160 },
      {
        field: "confidence",
        headerName: "Confidence",
        editable: true,
        width: 120,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: CONFIDENCE_LEVELS },
      },
      {
        field: "lead_fit",
        headerName: "Lead Fit",
        editable: true,
        width: 110,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: LEAD_FIT_LEVELS },
      },
      {
        field: "status",
        headerName: "Status",
        editable: true,
        width: 150,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: LEAD_STATUSES },
        cellClassRules: missingClassRule("status"),
      },
      { field: "owner", headerName: "Owner", editable: true, width: 120 },
      { field: "next_action", headerName: "Next Action", editable: true, minWidth: 140 },
      { field: "notes", headerName: "Notes", editable: true, minWidth: 160, flex: 1 },
      {
        headerName: "Validation",
        width: 110,
        cellRenderer: ValidationRenderer,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Actions",
        width: 120,
        pinned: "right",
        cellRenderer: EnrichButtonRenderer,
        sortable: false,
        filter: false,
      },
      {
        field: "updated_at",
        headerName: "Updated",
        width: 160,
        editable: false,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString() : "",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      editable: false,
    }),
    []
  );

  const onCellValueChanged = async (e: CellValueChangedEvent<WorkspaceLead>) => {
    if (!e.data?.id || e.newValue === e.oldValue) return;
    setSaving(true);
    try {
      const field = e.colDef.field as keyof WorkspaceLead | undefined;
      if (!field) return;
      const res = await fetchApi("/api/workspace/leads", {
        method: "PATCH",
        body: JSON.stringify({ id: e.data.id, [field]: e.newValue }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      onLeadUpdated(data.lead);
    } catch (err) {
      console.error(err);
      setMessage("Failed to save change");
      e.node.setDataValue(e.colDef.field!, e.oldValue);
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    try {
      const res = await fetchApi("/api/workspace/leads", {
        method: "POST",
        body: JSON.stringify({ company_name: "", domain: "", status: "New" }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      setRowData((prev) => [data.lead, ...prev]);
      onCountChange?.(rowData.length + 1);
    } catch (e) {
      console.error(e);
      setMessage("Could not add row");
    }
  };

  const deleteSelected = async () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const ids = api.getSelectedRows().map((r) => r.id);
    if (!ids.length) {
      setMessage("Select rows to delete");
      return;
    }
    try {
      const res = await fetchApi("/api/workspace/leads", {
        method: "POST",
        body: JSON.stringify({ action: "bulk_delete", ids }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setRowData((prev) => prev.filter((r) => !ids.includes(r.id)));
      onCountChange?.(rowData.length - ids.length);
    } catch (e) {
      console.error(e);
      setMessage("Could not delete rows");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetchApi("/api/workspace/leads/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setMessage("CSV export failed");
    }
  };

  const importCsv = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetchApi("/api/workspace/leads/import", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setMessage(`Imported ${data.imported} leads`);
      await loadLeads();
    } catch (e) {
      console.error(e);
      setMessage("CSV import failed");
    }
  };

  return (
    <div className="ws-grid-wrap">
      <div className="ws-toolbar">
        <div className="ws-toolbar-left">
          <button type="button" className="ws-btn ws-btn-primary" onClick={addRow}>
            + Add row
          </button>
          <button type="button" className="ws-btn" onClick={deleteSelected}>
            Delete selected
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Import CSV
          </button>
          <button type="button" className="ws-btn" onClick={exportCsv}>
            Export CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCsv(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="ws-toolbar-right">
          {saving && <span className="ws-status">Saving…</span>}
          {message && (
            <span className="ws-status ws-status-msg" onClick={() => setMessage(null)}>
              {message}
            </span>
          )}
          <span className="ws-hint">
            Required: {REQUIRED_FIELDS.map((f) => f.replace(/_/g, " ")).join(", ")}
          </span>
        </div>
      </div>

      <div className="ag-theme-quartz ws-ag-grid" style={{ width: "100%", height: "calc(100vh - 180px)" }}>
        {loading ? (
          <div className="ws-loading">Loading leads…</div>
        ) : (
          <AgGridReact<WorkspaceLead>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            context={gridContext}
            rowSelection="multiple"
            suppressRowClickSelection
            enableCellTextSelection
            ensureDomOrder
            animateRows
            onCellValueChanged={onCellValueChanged}
            getRowId={(p) => p.data.id}
            rowClassRules={{
              "ws-row-invalid": (p) => (p.data?.validation_errors?.length ?? 0) > 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
