"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { FLAGS } from "@/lib/utils";
import { useCompaniesPanel } from "@/lib/companies-panel-context";

export default function CompaniesListPanel() {
  const { leads } = useApp();
  const {
    selectedLeadId,
    requestScrollToLead,
    panelSearch,
    setPanelSearch,
    rightPanelOpen,
    setRightPanelOpen,
  } = useCompaniesPanel();

  const filtered = useMemo(() => {
    const q = panelSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.market.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q)
    );
  }, [leads, panelSearch]);

  if (!rightPanelOpen) {
    return (
      <aside className="bl-companies-panel bl-companies-panel-collapsed">
        <button
          type="button"
          className="bl-panel-expand"
          onClick={() => setRightPanelOpen(true)}
          title="Show companies"
        >
          ◀
        </button>
      </aside>
    );
  }

  return (
    <aside className="bl-companies-panel">
      <div className="bl-companies-head">
        <span className="bl-companies-title">Companies</span>
        <button
          type="button"
          className="bl-panel-collapse"
          onClick={() => setRightPanelOpen(false)}
          title="Hide panel"
        >
          ▶
        </button>
      </div>
      <div className="bl-companies-search">
        <input
          type="text"
          placeholder="Search companies…"
          value={panelSearch}
          onChange={(e) => setPanelSearch(e.target.value)}
        />
      </div>
      <div className="bl-companies-list">
        {filtered.length === 0 ? (
          <div className="bl-companies-empty">No companies found</div>
        ) : (
          filtered.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className={`bl-company-item${selectedLeadId === lead.id ? " active" : ""}`}
              onClick={() => requestScrollToLead(lead.id)}
            >
              <span className="bl-company-flag">{FLAGS[lead.country] ?? "🌐"}</span>
              <span className="bl-company-meta">
                <span className="bl-company-name">{lead.company}</span>
                <span className="bl-company-market">{lead.market || "—"}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
