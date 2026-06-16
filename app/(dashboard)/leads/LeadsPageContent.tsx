"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/utils";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import AddLeadModal from "@/components/AddLeadModal";
import LinkedInImport from "@/components/LinkedInImport";
import LeadsGrid from "@/components/LeadsGrid";

type Filter = LeadStatus | "alle";

export default function LeadsPageContent() {
  const searchParams = useSearchParams();
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
  } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Filter>("alle");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [runningEnrich, setRunningEnrich] = useState(false);
  const [runningHubSpot, setRunningHubSpot] = useState(false);

  useEffect(() => {
    const param = searchParams.get("selected");
    if (param && leads.some((l) => l.id === param)) {
      setSelectedId(param);
      toggleExpand(param);
    }
  }, [searchParams, leads, toggleExpand]);

  const filtered = useMemo(() => {
    return leads.filter((p) => {
      const ms = statusFilter === "alle" || p.status === statusFilter;
      const mq =
        !search ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        p.contactName.toLowerCase().includes(search.toLowerCase()) ||
        p.market.toLowerCase().includes(search.toLowerCase()) ||
        p.contacts.some(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase())
        );
      return ms && mq;
    });
  }, [leads, statusFilter, search]);

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

  async function runScoreAutomation() {
    const ids = selectedIds.size > 0 ? [...selectedIds] : filtered.map((l) => l.id);
    setRunningAutomation(true);
    const err = await recalculateScores(ids);
    if (err) showToast(err);
    setRunningAutomation(false);
  }

  async function runAiAutomation() {
    const ids = selectedIds.size > 0 ? [...selectedIds] : filtered.map((l) => l.id);
    setRunningAi(true);
    const err = await runAiColumns(ids);
    if (err) showToast(err);
    setRunningAi(false);
  }

  async function runEnrichAutomation() {
    const ids = selectedIds.size > 0 ? [...selectedIds] : filtered.map((l) => l.id);
    setRunningEnrich(true);
    const err = await enrichLeads(ids);
    if (err) showToast(err);
    setRunningEnrich(false);
  }

  async function runHubSpotSync() {
    const ids = selectedIds.size > 0 ? [...selectedIds] : filtered.map((l) => l.id);
    setRunningHubSpot(true);
    const err = await syncHubSpot(ids);
    if (err) showToast(err);
    setRunningHubSpot(false);
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
          className="btn-secondary"
          type="button"
          disabled={runningHubSpot || storageMode === "loading"}
          onClick={runHubSpotSync}
        >
          {runningHubSpot ? "HubSpot…" : "↑ HubSpot"}
        </button>
        <button
          className="btn-secondary"
          type="button"
          disabled={runningEnrich || storageMode === "loading"}
          onClick={runEnrichAutomation}
        >
          {runningEnrich ? "Verrijken…" : "▶ Verrijk geselecteerde"}
        </button>
        <button
          className="btn-secondary"
          type="button"
          disabled={runningAi || storageMode === "loading"}
          onClick={runAiAutomation}
        >
          {runningAi ? "AI bezig…" : "▶ AI kolommen vullen"}
        </button>
        <button
          className="btn-secondary"
          type="button"
          disabled={runningAutomation || storageMode === "loading"}
          onClick={runScoreAutomation}
        >
          {runningAutomation ? "Bezig…" : "▶ Herbereken score"}
        </button>
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
        </div>

        <div className="table-area">
          <div className="table-main">
            <LeadsGrid
              leads={filtered}
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
            />
            <div className="grid-footer">
              {filtered.length} van {leads.length} leads
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
        <LinkedInImport onClose={() => setShowLinkedInImport(false)} />
      )}
    </>
  );
}
