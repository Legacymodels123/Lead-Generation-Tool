"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCompaniesPanel } from "@/lib/companies-panel-context";
import {
  createCustomColumnClient,
  fetchCustomColumnsClient,
  updateCustomColumnClient,
} from "@/lib/custom-columns-client";
import { customColumnGridId } from "@/lib/merge-grid-columns";
import { WORKFLOW_PRESETS } from "@/lib/automation/presets";
import { exportLeadsToCsv } from "@/lib/export-csv";
import { filterAndSortLeads } from "@/lib/lead-filters";
import { useApp } from "@/lib/store";
import type { CustomColumn, CustomColumnType, LeadStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import type { AiColumnKey } from "@/lib/types/automation";
import {
  DEFAULT_VIEWS,
  loadViews,
  saveViews,
  type LeadView,
  type SortField,
  type SortDir,
} from "@/lib/views";
import AddLeadModal from "@/components/AddLeadModal";
import ColumnPropertyDrawer from "@/components/ColumnPropertyDrawer";
import ColumnPicker from "@/components/ColumnPicker";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import LeadsGrid, { type ColumnAction } from "@/components/LeadsGrid";
import LinkedInImport from "@/components/LinkedInImport";
import ViewSelector from "@/components/ViewSelector";

type Filter = LeadStatus | "alle";

export default function CompaniesSpreadsheet() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const {
    selectedLeadId,
    setSelectedLeadId,
    scrollToLeadId,
    clearScrollRequest,
  } = useCompaniesPanel();
  const {
    leads,
    showToast,
    updateLead,
    updateContact,
    toggleExpand,
    addQuickRow,
    recalculateScores,
    runAiColumns,
    enrichLeads,
    syncHubSpot,
    runWorkflow,
    pushInstantly,
    refetchLeads,
    runColumnAutomation,
    researchWebsite,
    deleteCustomColumn,
  } = useApp();

  const [views, setViews] = useState<LeadView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState("alle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastCheckboxIndex = useRef<number | null>(null);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [drawerColumn, setDrawerColumn] = useState<CustomColumn | null>(null);
  const [drawerInitialType, setDrawerInitialType] = useState<CustomColumnType>("text");
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [minScore, setMinScore] = useState<number | "">("");
  const [batchFilter, setBatchFilter] = useState("");
  const [hasEmailFilter, setHasEmailFilter] = useState(false);

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? views[0],
    [views, activeViewId]
  );

  useEffect(() => {
    if (!user) return;
    const loaded = loadViews(user.id);
    setViews(loaded);
    setActiveViewId(loaded[0]?.id ?? "alle");
  }, [user?.id]);

  useEffect(() => {
    if (!user?.workspaceId) return;
    void fetchCustomColumnsClient(user.workspaceId, token).then(setCustomColumns);
  }, [user?.workspaceId, token]);

  useEffect(() => {
    if (selectedLeadId !== null) setSelectedId(selectedLeadId);
  }, [selectedLeadId]);

  const handleSelectRow = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSelectedLeadId(id);
    },
    [setSelectedLeadId]
  );

  useEffect(() => {
    if (!activeView) return;
    setMinScore(activeView.advancedFilters?.minScore ?? "");
    setBatchFilter(activeView.advancedFilters?.batch ?? "");
    setHasEmailFilter(activeView.advancedFilters?.hasEmail ?? false);
  }, [activeViewId, activeView]);

  const currentView: LeadView = useMemo(
    () => ({
      ...activeView,
      advancedFilters: {
        minScore: minScore === "" ? undefined : minScore,
        batch: batchFilter || undefined,
        hasEmail: hasEmailFilter || undefined,
      },
    }),
    [activeView, minScore, batchFilter, hasEmailFilter]
  );

  const statusFilter = currentView.statusFilter;
  const search = currentView.search;

  useEffect(() => {
    setSelectedIds(new Set());
    lastCheckboxIndex.current = null;
  }, [activeViewId, statusFilter, search, minScore, batchFilter, hasEmailFilter]);

  const setStatusFilter = useCallback(
    (s: Filter) => {
      setViews((prev) => {
        const next = prev.map((v) =>
          v.id === activeViewId ? { ...v, statusFilter: s } : v
        );
        if (user) saveViews(user.id, next);
        return next;
      });
    },
    [activeViewId, user]
  );

  const setSearch = useCallback(
    (value: string) => {
      setViews((prev) => {
        const next = prev.map((v) => (v.id === activeViewId ? { ...v, search: value } : v));
        if (user) saveViews(user.id, next);
        return next;
      });
    },
    [activeViewId, user]
  );

  useEffect(() => {
    const param = searchParams.get("selected");
    if (param && leads.some((l) => l.id === param)) {
      setSelectedId(param);
      toggleExpand(param);
    }
  }, [searchParams, leads, toggleExpand]);

  const batchOptions = useMemo(() => {
    const set = new Set(leads.map((l) => l.batch).filter(Boolean));
    return [...set].sort().reverse();
  }, [leads]);

  const filtered = useMemo(
    () => filterAndSortLeads(leads, currentView),
    [leads, currentView]
  );

  const selected = leads.find((p) => p.id === selectedId);

  const stats = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter((p) => p.status === "qualified").length;
    const notQualified = leads.filter((p) => p.status === "not_qualified").length;
    const newBatch = leads.filter((p) => p.isNew).length;
    const scores = leads.map((l) => l.score ?? 0).filter((s) => s > 0);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const latestBatch = leads.find((p) => p.isNew)?.batch ?? leads[0]?.batch;
    return { total, qualified, notQualified, newBatch, avgScore, latestBatch };
  }, [leads]);

  function copyMsg(id: string) {
    const p = leads.find((x) => x.id === id);
    if (!p) return;
    const msg = p.aiMessage || p.message || p.contacts[0]?.message || "";
    navigator.clipboard.writeText(msg);
    showToast("Message copied");
  }

  const toggleSelect = useCallback(
    (id: string, shiftKey = false) => {
      const ids = filtered.map((l) => l.id);
      const idx = ids.indexOf(id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastCheckboxIndex.current !== null && idx >= 0) {
          const start = Math.min(lastCheckboxIndex.current, idx);
          const end = Math.max(lastCheckboxIndex.current, idx);
          for (let i = start; i <= end; i++) next.add(ids[i]);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });

      if (idx >= 0) lastCheckboxIndex.current = idx;
    },
    [filtered]
  );

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allOnPage = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOnPage) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const targetIds = useCallback(
    () => (selectedIds.size > 0 ? [...selectedIds] : filtered.map((l) => l.id)),
    [selectedIds, filtered]
  );

  async function handleColumnAction(action: ColumnAction) {
    const ids = targetIds();
    if (action === "score") {
      const err = await recalculateScores(ids);
      if (err) showToast(err);
      return;
    }
    if (action === "enrich") {
      const err = await enrichLeads(ids);
      if (err) showToast(err);
      return;
    }
    if (action === "hubspot") {
      const err = await syncHubSpot(ids);
      if (err) showToast(err);
      return;
    }
    if (action === "instantly") {
      const err = await pushInstantly(ids);
      if (err) showToast(err);
      return;
    }
    if (typeof action === "string" && action.startsWith("custom:")) {
      const key = action.slice(7);
      const column = customColumns.find((c) => c.key === key);
      if (column) {
        const err = await runColumnAutomation(column, ids);
        if (err) showToast(err);
      }
      return;
    }
    if (typeof action === "string" && action.startsWith("research:")) {
      const key = action.slice(9);
      const err = await researchWebsite(ids, key);
      if (err) showToast(err);
      return;
    }
    const col = action as AiColumnKey;
    const err = await runAiColumns(ids, [col]);
    if (err) showToast(err);
  }

  async function handleRowAction(action: ColumnAction, leadId: string) {
    if (action === "hubspot") {
      const err = await syncHubSpot([leadId]);
      if (err) showToast(err);
      return;
    }
    if (action === "instantly") {
      const err = await pushInstantly([leadId]);
      if (err) showToast(err);
    }
  }

  async function runPreset(presetId: string) {
    setRunningWorkflow(true);
    setWorkflowOpen(false);
    const err = await runWorkflow(presetId, targetIds());
    if (err) showToast(err);
    setRunningWorkflow(false);
  }

  function handleSort(field: SortField) {
    setViews((prev) => {
      const next = prev.map((v) => {
        if (v.id !== activeViewId) return v;
        const cur = v.sort;
        const dir: SortDir =
          cur?.field === field ? (cur.dir === "asc" ? "desc" : "asc") : "asc";
        return { ...v, sort: { field, dir } };
      });
      if (user) saveViews(user.id, next);
      return next;
    });
  }

  function handleColumnsChange(columns: string[]) {
    setViews((prev) => {
      const next = prev.map((v) =>
        v.id === activeViewId ? { ...v, visibleColumns: columns } : v
      );
      if (user) saveViews(user.id, next);
      return next;
    });
  }

  function handleSaveView(name: string) {
    const snapshot: LeadView = {
      ...currentView,
      id: `view-${Date.now()}`,
      name,
    };
    setViews((prev) => {
      const next = [...prev, snapshot];
      if (user) saveViews(user.id, next);
      return next;
    });
    setActiveViewId(snapshot.id);
    showToast(`View "${name}" saved`);
  }

  function handleDeleteView(id: string) {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      if (user) saveViews(user.id, next);
      return next;
    });
    if (activeViewId === id) setActiveViewId("alle");
  }

  function handleExport() {
    exportLeadsToCsv(filtered, `companies-${activeView.name.replace(/\s+/g, "-").toLowerCase()}.csv`);
    showToast(`Exported ${filtered.length} rows`);
  }

  function openCreateProperty(type: CustomColumnType) {
    setDrawerMode("create");
    setDrawerColumn(null);
    setDrawerInitialType(type);
    setDrawerOpen(true);
    setPropertyMenuOpen(false);
  }

  function openEditProperty(colId: string) {
    const key = colId.startsWith("custom:") ? colId.slice(7) : colId;
    const column = customColumns.find((c) => c.key === key);
    if (!column) return;
    setDrawerMode("edit");
    setDrawerColumn(column);
    setDrawerOpen(true);
  }

  async function handleSaveProperty(data: {
    label: string;
    type: CustomColumnType;
    defaultValue?: string;
    selectOptions?: string[];
    aiPrompt?: string;
    condition?: CustomColumn["condition"];
  }) {
    if (!user?.workspaceId) return;
    if (drawerMode === "create") {
      const created = await createCustomColumnClient(user.workspaceId, token, data);
      if (!created) throw new Error("create failed");
      setCustomColumns((prev) => [...prev, created]);
      const colId = customColumnGridId(created);
      if (!currentView.visibleColumns.includes(colId)) {
        handleColumnsChange([...currentView.visibleColumns, colId]);
      }
      showToast(`Property "${created.label}" added`);
      return;
    }
    if (!drawerColumn) return;
    const updated = await updateCustomColumnClient(token, user.workspaceId, drawerColumn.id, data);
    if (!updated) throw new Error("update failed");
    setCustomColumns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    showToast("Property saved");
  }

  async function runAiPropertyColumn() {
    if (!drawerColumn || !token) return;
    const ids = targetIds();
    const res = await fetch("/api/columns/run-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ columnId: drawerColumn.id, leadIds: ids }),
    });
    if (!res.ok) {
      showToast("AI run failed");
      return;
    }
    const data = await res.json();
    await refetchLeads();
    showToast(`AI updated ${data.updated} rows`);
  }

  return (
    <div className="worksheet-shell">
      <div className="sheet-toolbar">
        <div className="sheet-toolbar-left">
          <span className="sheet-title">Companies</span>
          <span className="sheet-meta">
            {filtered.length} rows · {stats.qualified} qualified · avg {stats.avgScore}%
          </span>
        </div>
        <div className="sheet-toolbar-right">
          {user && (
            <ViewSelector
              views={views}
              activeViewId={activeViewId}
              onSelect={setActiveViewId}
              onSaveCurrent={handleSaveView}
              onDelete={handleDeleteView}
            />
          )}
          <ColumnPicker
            visibleColumns={currentView.visibleColumns}
            customColumns={customColumns}
            onChange={handleColumnsChange}
          />
          <div className="property-add-dropdown">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setPropertyMenuOpen(!propertyMenuOpen)}
            >
              + Property
            </button>
            {propertyMenuOpen && (
              <div className="property-add-menu">
                <button type="button" onClick={() => openCreateProperty("text")}>
                  Single line text
                </button>
                <button type="button" onClick={() => openCreateProperty("select")}>
                  Dropdown
                </button>
                <button type="button" onClick={() => openCreateProperty("ai_enriched")}>
                  AI enriched
                </button>
              </div>
            )}
          </div>
          <div className="search-box search-box-compact">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary btn-sm"
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            CSV
          </button>
          <div className="workflow-dropdown">
            <button
              className="btn-secondary btn-sm"
              type="button"
              disabled={runningWorkflow}
              onClick={() => setWorkflowOpen(!workflowOpen)}
            >
              {runningWorkflow ? "…" : "▶ Workflow"}
            </button>
            {workflowOpen && (
              <div className="workflow-menu">
                {WORKFLOW_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => runPreset(p.id)}>
                    <strong>{p.label}</strong>
                    <span>{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-secondary btn-sm"
            type="button"
            onClick={() => setShowLinkedInImport(true)}
          >
            Import
          </button>
          <button className="btn-primary btn-sm" type="button" onClick={() => setShowAddModal(true)}>
            + Row
          </button>
        </div>
      </div>

      <div className="sheet-filters">
        {(["alle", "qualified", "not_qualified"] as Filter[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-pill filter-pill-compact${statusFilter === s ? " active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "alle" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
        <span className="filter-sep" />
        <label className="filter-advanced">
          Min
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(e.target.value === "" ? "" : Number(e.target.value))}
            className="filter-input"
          />
        </label>
        <label className="filter-advanced">
          Batch
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-advanced filter-check">
          <input
            type="checkbox"
            checked={hasEmailFilter}
            onChange={(e) => setHasEmailFilter(e.target.checked)}
          />
          Email
        </label>
        <span className="sheet-hint">Click · type · F2 edit · drag corner · Ctrl+C/V</span>
      </div>

      <div className="sheet-body-row">
        <div className="sheet-body">
          <LeadsGrid
            leads={filtered}
            visibleColumns={currentView.visibleColumns}
            customColumns={customColumns}
            sort={currentView.sort}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onUpdate={updateLead}
            onUpdateContact={updateContact}
            onToggleExpand={toggleExpand}
            onAddRow={addQuickRow}
            onCopyMessage={copyMsg}
            onSort={handleSort}
            onColumnAction={handleColumnAction}
            onRowAction={handleRowAction}
            onOpenColumnProperty={openEditProperty}
            scrollToLeadId={scrollToLeadId}
            onScrolledToLead={clearScrollRequest}
          />
          <div className="grid-footer sheet-footer">
            {filtered.length} visible · {currentView.name}
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </div>
        </div>

        <ColumnPropertyDrawer
          open={drawerOpen}
          column={drawerColumn}
          mode={drawerMode}
          initialType={drawerInitialType}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSaveProperty}
          onRunAi={drawerColumn?.type === "ai_enriched" ? runAiPropertyColumn : undefined}
        />
      </div>

      {selected && (
        <LeadDetailPanel
          lead={selected}
          onClose={() => {
            setSelectedId(null);
            setSelectedLeadId(null);
          }}
        />
      )}

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
      {showLinkedInImport && <LinkedInImport onClose={() => setShowLinkedInImport(false)} />}
    </div>
  );
}
