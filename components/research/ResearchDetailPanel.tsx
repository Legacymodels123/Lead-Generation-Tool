"use client";

import { useMemo } from "react";
import { useResearchWorkspace } from "@/lib/research-workspace";

const STATUS_OPTIONS = [
  { id: "new", label: "New" },
  { id: "researching", label: "Researching" },
  { id: "ready", label: "Ready" },
  { id: "qualified", label: "Qualified" },
  { id: "rejected", label: "Rejected" },
] as const;

export default function ResearchDetailPanel() {
  const { selectedRow, selectRow, updateRow, markStatus, runResearch, syncToHubSpot } = useResearchWorkspace();

  const websiteHref = useMemo(() => {
    if (!selectedRow?.website) return null;
    return selectedRow.website.startsWith("http") ? selectedRow.website : `https://${selectedRow.website}`;
  }, [selectedRow]);

  if (!selectedRow) {
    return (
      <aside className="research-detail-panel empty">
        <h3>Research panel</h3>
        <p>Select a company row to inspect the research summary, qualification reasoning, notes, and sync actions.</p>
      </aside>
    );
  }

  return (
    <aside className="research-detail-panel">
      <div className="research-detail-head">
        <div>
          <span className="research-row-status-pill">{selectedRow.qualificationStatus}</span>
          <h3>{selectedRow.companyName || "Untitled company"}</h3>
          <p>{selectedRow.domain || "No domain yet"}</p>
        </div>
        <button type="button" onClick={() => selectRow(null)}>
          Close
        </button>
      </div>

      <div className="research-detail-actions">
        <button type="button" className="research-primary-btn" onClick={() => void runResearch([selectedRow.id])}>
          Run research
        </button>
        <button type="button" className="research-secondary-btn" onClick={() => void syncToHubSpot([selectedRow.id])}>
          Sync to HubSpot
        </button>
      </div>

      <section className="research-detail-section">
        <h4>Company profile</h4>
        <div className="research-kv-list">
          <div><span>Domain</span><strong>{selectedRow.domain || "—"}</strong></div>
          <div><span>Location</span><strong>{[selectedRow.city, selectedRow.country].filter(Boolean).join(", ") || "—"}</strong></div>
          <div><span>Industry</span><strong>{selectedRow.industry || "—"}</strong></div>
          <div><span>Employee range</span><strong>{selectedRow.employeeRange || "—"}</strong></div>
          <div><span>Sync status</span><strong>{selectedRow.syncStatus}</strong></div>
          <div><span>Contacts found</span><strong>{selectedRow.contactsCount}</strong></div>
        </div>
        {websiteHref && (
          <a href={websiteHref} target="_blank" rel="noreferrer" className="research-inline-link">
            Open website
          </a>
        )}
      </section>

      <section className="research-detail-section">
        <h4>Qualification</h4>
        <div className="research-status-grid">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`research-status-btn${selectedRow.qualificationStatus === option.id ? " active" : ""}`}
              onClick={() => void markStatus(selectedRow.id, option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="research-detail-section">
        <h4>Research summary</h4>
        <textarea
          className="research-detail-textarea"
          value={selectedRow.researchSummary}
          onChange={(event) =>
            void updateRow(selectedRow.id, {
              researchSummary: event.target.value,
              aiSummary: event.target.value,
            })
          }
        />
      </section>

      <section className="research-detail-section">
        <h4>Fit reasoning</h4>
        <textarea
          className="research-detail-textarea"
          value={selectedRow.fitReason}
          onChange={(event) => void updateRow(selectedRow.id, { fitReason: event.target.value })}
        />
      </section>

      <section className="research-detail-section">
        <h4>Operator notes</h4>
        <textarea
          className="research-detail-textarea"
          value={selectedRow.notes}
          onChange={(event) => void updateRow(selectedRow.id, { notes: event.target.value })}
        />
      </section>

      <section className="research-detail-section">
        <h4>Next step</h4>
        <textarea
          className="research-detail-textarea"
          value={selectedRow.aiNextStep}
          onChange={(event) => void updateRow(selectedRow.id, { aiNextStep: event.target.value })}
        />
      </section>
    </aside>
  );
}
