"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { WORKFLOW_PRESETS } from "@/lib/automation/presets";
import { exportLeadsToCsv } from "@/lib/export-csv";
import { filterAndSortLeads } from "@/lib/lead-filters";
import { useApp } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import type { AiColumnKey } from "@/lib/types/automation";
import { loadUserSettings } from "@/lib/user-settings";
import {
  DEFAULT_VIEWS,
  loadViews,
  saveViews,
  type LeadView,
  type SortField,
  type SortDir,
} from "@/lib/views";
import { STATUS_LABELS } from "@/lib/utils";
import AddLeadModal from "@/components/AddLeadModal";
import ColumnPicker from "@/components/ColumnPicker";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import LeadsGrid, { type ColumnAction } from "@/components/LeadsGrid";
import LinkedInImport from "@/components/LinkedInImport";
import ViewSelector from "@/components/ViewSelector";

type Filter = LeadStatus | "alle";

export default function LeadsPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    leads,
    showToast,
    storageMode,
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
  } = useApp();

  const [views, setViews] = useState<LeadView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState("alle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    const nieuw = leads.filter((p) => p.status === "nieuw").length;
    const verstuurd = leads.filter((p) => p.status === "verstuurd").length;
    const opvolgen = leads.filter((p) => p.status === "opvolgen").length;
    const gewonnen = leads.filter((p) => p.status === "gewonnen").length;
    const verloren = leads.filter((p) => p.status === "verloren").length;
    const bekeken = leads.filter((p) => p.status === "bekeken").length;
    const newBatch = leads.filter((p) => p.isNew).length;
    const conv = total ? Math.round((gewonnen / total) * 100) : 0;
    const maxFunnel = Math.max(nieuw + 3, verstuurd + 2, opvolgen + 1, gewonnen, 1);
    const funnelH = (n: number) => Math.max(8, Math.round((n / maxFunnel) * 36));
    const latestBatch = leads.find((p) => p.isNew)?.batch ?? leads[0]?.batch;
    return {
      total,
      nieuw,
      verstuurd,
      opvolgen,
      gewonnen,
      verloren,
      bekeken,
      newBatch,
      conv,
      funnelH,
      latestBatch,
    };
  }, [leads]);

  function copyMsg(id: string) {
    const p = leads.find((x) => x.id === id);
    if (!p) return;
    const msg = p.aiMessage || p.message || p.contacts[0]?.message || "";
    navigator.clipboard.writeText(msg);
    showToast("Bericht gekopieerd!");
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    showToast(`View "${name}" opgeslagen`);
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
    exportLeadsToCsv(filtered, `leads-${activeView.name.replace(/\s+/g, "-").toLowerCase()}.csv`);
    showToast(`${filtered.length} rijen geëxporteerd`);
  }

  const funnelStages = [
    { label: "Nieuw", n: stats.nieuw, cls: "s1" },
    { label: "Bekeken", n: stats.bekeken, cls: "s2" },
    { label: "Verstuurd", n: stats.verstuurd, cls: "s3" },
    { label: "Opvolgen", n: stats.opvolgen, cls: "s4" },
    { label: "Gewonnen", n: stats.gewonnen, cls: "s4" },
    { label: "Verloren", n: stats.verloren, cls: "s5" },
  ];

  const storageLabel =
    storageMode === "cloud"
      ? "☁️ Cloud actief"
      : storageMode === "local"
        ? "💾 Lokaal (browser)"
        : "Laden…";

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Lead Intelligence</span>
        <span className="topbar-sub">— Legacy Scale Models</span>
        <span className={`storage-badge storage-${storageMode}`}>{storageLabel}</span>
        <div className="topbar-spacer" />
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
          onChange={handleColumnsChange}
        />
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Zoek bedrijf, contact, markt..."
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
          Export CSV
        </button>
        <div className="workflow-dropdown">
          <button
            className="btn-secondary"
            type="button"
            disabled={runningWorkflow || storageMode === "loading"}
            onClick={() => setWorkflowOpen(!workflowOpen)}
          >
            {runningWorkflow ? "Workflow…" : "▶ Workflow"}
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
          className="btn-secondary"
          type="button"
          onClick={() => setShowLinkedInImport(true)}
        >
          Importeer LinkedIn CSV
        </button>
        <button className="btn-primary" type="button" onClick={() => setShowAddModal(true)}>
          + Voeg lead toe
        </button>
      </div>

      <div className="content">
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Totaal leads</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-delta">Account + 2 DMU contacten</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Nieuw</div>
            <div className="stat-value red">{stats.nieuw}</div>
            <div className="stat-delta">Nog te beoordelen</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Op te volgen</div>
            <div className="stat-value orange">{stats.opvolgen}</div>
            <div className="stat-delta">Actie vereist</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Conversie</div>
            <div className="stat-value green">{stats.conv}%</div>
            <div className="stat-delta">
              {stats.gewonnen} van {stats.total} gewonnen
            </div>
          </div>
          <div className="funnel-card">
            <div className="funnel-label">Pipeline funnel</div>
            <div className="funnel-stages">
              {funnelStages.map((stage) => (
                <div key={stage.label} className="funnel-stage">
                  <div className="funnel-stage-num">{stage.n}</div>
                  <div
                    className={`funnel-bar ${stage.cls}`}
                    style={{ height: stats.funnelH(stage.n) }}
                  />
                  <div className="funnel-stage-label">{stage.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {stats.newBatch > 0 && (
          <div className="batch-banner">
            <div className="batch-dot" />
            <div className="batch-text">
              <strong>
                Nightly batch —{" "}
                {stats.latestBatch
                  ? new Date(stats.latestBatch).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "vandaag"}
              </strong>
              &nbsp;·&nbsp; Automatisch gegenereerd door de AI agent
            </div>
            <div className="batch-count">{stats.newBatch} nieuwe leads</div>
          </div>
        )}

        <div className="filter-bar">
          {(
            ["alle", "nieuw", "bekeken", "verstuurd", "opvolgen", "gewonnen", "verloren"] as Filter[]
          ).map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-pill${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "alle" ? "Alle leads" : STATUS_LABELS[s]}
            </button>
          ))}
          <span className="filter-sep" />
          <label className="filter-advanced">
            Min score
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) =>
                setMinScore(e.target.value === "" ? "" : Number(e.target.value))
              }
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
              <option value="">Alle</option>
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
            Heeft e-mail
          </label>
        </div>

        <div className="table-area">
          <div className="table-main">
            <LeadsGrid
              leads={filtered}
              visibleColumns={currentView.visibleColumns}
              sort={currentView.sort}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelectRow={setSelectedId}
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
            />
            <div className="grid-footer">
              {filtered.length} rijen · view: {currentView.name}
              {filtered.length !== leads.length && ` (${leads.length} totaal)`}
              {selectedIds.size > 0 && ` · ${selectedIds.size} geselecteerd`}
            </div>
          </div>

          {selected && (
            <LeadDetailPanel lead={selected} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
      {showLinkedInImport && (
        <LinkedInImport
          onClose={() => setShowLinkedInImport(false)}
          autoPipeline={user ? loadUserSettings(user.id).autoImportPipeline : false}
        />
      )}
    </>
  );
}
