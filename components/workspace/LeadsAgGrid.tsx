"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type GridReadyEvent,
  type ICellRendererParams,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useWorkspaceFetch } from "@/lib/workspace/fetch";
import {
  CONFIDENCE_LEVELS,
  DRAFT_ROW_ID,
  LEAD_FIT_LEVELS,
  LEAD_STATUSES,
  REQUIRED_FIELDS,
  SEGMENT_OPTIONS,
} from "@/lib/workspace/constants";
import { createDraftWorkspaceLead, isDraftWorkspaceLead } from "@/lib/workspace/draft-row";
import { isFieldMissing } from "@/lib/workspace/validation";
import type { WorkspaceLead } from "@/lib/workspace/types";
import {
  ConfidenceCellRenderer,
  LeadFitCellRenderer,
  StatusCellRenderer,
  TextCellRenderer,
  ValidationCellRenderer,
} from "@/components/workspace/ag-grid-cells";

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
      onClick={(e) => {
        e.stopPropagation();
        void enrich();
      }}
      disabled={loading || !params.data?.id}
    >
      {loading ? "…" : "Enrich"}
    </button>
  );
}

interface Props {
  onCountChange?: (n: number) => void;
}

function editableCol(
  field: keyof WorkspaceLead,
  headerName: string,
  extra: Partial<ColDef<WorkspaceLead>> = {}
): ColDef<WorkspaceLead> {
  const isSelect = Boolean(extra.cellEditor);
  return {
    ...extra,
    field,
    headerName,
    editable: true,
    minWidth: extra.minWidth ?? 120,
    cellEditor: extra.cellEditor ?? "agTextCellEditor",
    cellRenderer: extra.cellRenderer ?? (isSelect ? undefined : TextCellRenderer),
    cellClassRules: {
      ...(REQUIRED_FIELDS.includes(field as (typeof REQUIRED_FIELDS)[number])
        ? {
            "ws-cell-missing": (p) => (p.data ? isFieldMissing(p.data, field) : false),
          }
        : {}),
      ...extra.cellClassRules,
    },
  };
}

export default function LeadsAgGrid({ onCountChange }: Props) {
  const gridRef = useRef<AgGridReact<WorkspaceLead>>(null);
  const fetchApi = useWorkspaceFetch();
  const [rowData, setRowData] = useState<WorkspaceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState("");
  const [draftVersion, setDraftVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftRow = useMemo(() => createDraftWorkspaceLead(), [draftVersion]);
  const gridRows = useMemo(() => [...rowData, draftRow], [rowData, draftRow]);

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

  const columnDefs = useMemo<ColDef<WorkspaceLead>[]>(
    () => [
      {
        headerName: "#",
        width: 52,
        maxWidth: 52,
        pinned: "left",
        lockPosition: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        resizable: false,
        editable: false,
        cellClass: "ws-row-num",
        valueGetter: (p) => {
          if (isDraftWorkspaceLead(p.data)) return "";
          return (p.node?.rowIndex ?? 0) + 1;
        },
      },
      editableCol("company_name", "Company", {
        minWidth: 200,
        pinned: "left",
        flex: 1,
      }),
      editableCol("domain", "Domain", { minWidth: 150, pinned: "left" }),
      editableCol("segment", "Segment", {
        minWidth: 150,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["", ...SEGMENT_OPTIONS] },
      }),
      editableCol("fleet_brand", "Fleet Brand", { minWidth: 140 }),
      editableCol("fleet_type", "Fleet Type", { minWidth: 140 }),
      editableCol("evidence_summary", "Evidence Summary", { minWidth: 240, flex: 2 }),
      editableCol("evidence_url", "Evidence URL", { minWidth: 180 }),
      editableCol("confidence", "Confidence", {
        width: 130,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: CONFIDENCE_LEVELS },
        cellRenderer: ConfidenceCellRenderer,
      }),
      editableCol("lead_fit", "Lead Fit", {
        width: 120,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: LEAD_FIT_LEVELS },
        cellRenderer: LeadFitCellRenderer,
      }),
      editableCol("status", "Status", {
        width: 160,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: LEAD_STATUSES },
        cellRenderer: StatusCellRenderer,
      }),
      editableCol("owner", "Owner", { width: 120 }),
      editableCol("next_action", "Next Action", { minWidth: 150 }),
      editableCol("notes", "Notes", { minWidth: 180, flex: 1 }),
      {
        headerName: "Validation",
        width: 100,
        cellRenderer: ValidationCellRenderer,
        sortable: false,
        filter: false,
      },
      {
        headerName: "",
        width: 88,
        pinned: "right",
        cellRenderer: EnrichButtonRenderer,
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        field: "created_at",
        headerName: "Created",
        width: 150,
        editable: false,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : ""),
      },
      {
        field: "updated_at",
        headerName: "Updated",
        width: 150,
        editable: false,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : ""),
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
      suppressHeaderMenuButton: false,
      wrapText: false,
      autoHeight: false,
    }),
    []
  );

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.setGridOption("popupParent", document.body);
  }, []);

  const onCellValueChanged = async (e: CellValueChangedEvent<WorkspaceLead>) => {
    if (!e.data?.id || e.newValue === e.oldValue) return;

    if (isDraftWorkspaceLead(e.data)) {
      const field = e.colDef.field as keyof WorkspaceLead | undefined;
      if (!field) return;
      if (!String(e.newValue ?? "").trim()) {
        e.node.setDataValue(field, e.oldValue ?? "");
        return;
      }

      setSaving(true);
      try {
        const res = await fetchApi("/api/workspace/leads", {
          method: "POST",
          body: JSON.stringify({ [field]: e.newValue, status: "New" }),
        });
        if (!res.ok) throw new Error("Create failed");
        const data = await res.json();
        setRowData((prev) => [data.lead, ...prev]);
        onCountChange?.(rowData.length + 1);
        setDraftVersion((v) => v + 1);
      } catch (err) {
        console.error(err);
        setMessage("Could not create lead");
        e.node.setDataValue(field, "");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const field = e.colDef.field as keyof WorkspaceLead | undefined;
      if (!field) return;
      const res = await fetchApi("/api/workspace/leads", {
        method: "PATCH",
        body: JSON.stringify({ id: e.data.id, [field]: e.newValue ?? "" }),
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
      requestAnimationFrame(() => {
        const api = gridRef.current?.api;
        if (!api) return;
        api.ensureIndexVisible(0, "top");
        api.setFocusedCell(0, "company_name");
        api.startEditingCell({ rowIndex: 0, colKey: "company_name" });
      });
    } catch (e) {
      console.error(e);
      setMessage("Could not add row");
    }
  };

  const deleteSelected = async () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const ids = api
      .getSelectedRows()
      .map((r) => r.id)
      .filter((id) => id !== DRAFT_ROW_ID);
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
          <button type="button" className="ws-btn" onClick={() => void exportCsv()}>
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
          <input
            type="search"
            className="ws-quick-filter"
            placeholder="Filter rows…"
            value={quickFilter}
            onChange={(e) => {
              const v = e.target.value;
              setQuickFilter(v);
              gridRef.current?.api?.setGridOption("quickFilterText", v);
            }}
          />
          {saving && <span className="ws-status">Saving…</span>}
          {message && (
            <span className="ws-status ws-status-msg" onClick={() => setMessage(null)}>
              {message}
            </span>
          )}
          <span className="ws-record-count">{rowData.length} leads</span>
        </div>
      </div>

      <div className="ws-ag-grid-host">
        {loading ? (
          <div className="ws-loading">Loading leads…</div>
        ) : (
          <div className="ag-theme-quartz ws-ag-theme" style={{ width: "100%", height: "100%" }}>
            <AgGridReact<WorkspaceLead>
              ref={gridRef}
              rowData={gridRows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              context={gridContext}
              rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true }}
              isRowSelectable={(p) => !isDraftWorkspaceLead(p.data)}
              suppressRowClickSelection
              singleClickEdit
              stopEditingWhenCellsLoseFocus
              enterNavigatesVertically
              enterNavigatesVerticallyAfterEdit
              undoRedoCellEditing
              enableCellTextSelection={false}
              ensureDomOrder
              animateRows={false}
              onGridReady={onGridReady}
              onCellValueChanged={onCellValueChanged}
              getRowId={(p) => p.data.id}
              rowHeight={36}
              headerHeight={38}
              rowClassRules={{
                "ws-row-invalid": (p) =>
                  !isDraftWorkspaceLead(p.data) && (p.data?.validation_errors?.length ?? 0) > 0,
                "ws-draft-row": (p) => isDraftWorkspaceLead(p.data),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
