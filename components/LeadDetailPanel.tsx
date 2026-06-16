"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { useApp } from "@/lib/store";
import { FLAGS, STATUS_CLASS, STATUS_LABELS, scoreColor } from "@/lib/utils";

interface Props {
  lead: Lead;
  onClose: () => void;
}

export default function LeadDetailPanel({ lead, onClose }: Props) {
  const { updateLead, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  function copyMessage() {
    navigator.clipboard.writeText(lead.message);
    setCopied(true);
    showToast("Bericht gekopieerd!");
    setTimeout(() => setCopied(false), 2000);
  }

  function setStatus(status: LeadStatus) {
    updateLead(lead.id, { status, isNew: false });
  }

  return (
    <div className="side-panel open">
      <div className="panel-header">
        <button className="panel-close" onClick={onClose} type="button">
          ×
        </button>
        <div className="panel-flag">{FLAGS[lead.country] ?? "🌍"}</div>
        <div className="panel-company">{lead.company}</div>
        <div className="panel-sector">{lead.sector}</div>
      </div>
      <div className="panel-body">
        <div className="panel-score-row">
          <div>
            <div className="panel-score-label">Fit score</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
              Op basis van omvang & sector
            </div>
          </div>
          <div className="panel-score-value" style={{ color: scoreColor(lead.score ?? 0) }}>
            {lead.score}%
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Bedrijfsinfo</div>
          <div className="panel-kv">
            <span className="panel-k">Land</span>
            <span className="panel-v">{lead.country}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Medewerkers</span>
            <span className="panel-v">{lead.employees.toLocaleString("nl-NL")}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Omzet</span>
            <span className="panel-v">{lead.revenue}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Markt</span>
            <span className="panel-v">{lead.market || "—"}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Waarom fit</span>
            <span className="panel-v">{lead.fitReason || "—"}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Sector</span>
            <span className="panel-v">{lead.sector}</span>
          </div>
          <div className="panel-kv">
            <span className="panel-k">Batch</span>
            <span className="panel-v">{lead.batch}</span>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Contactpersoon</div>
          <div className="contact-card">
            <div className="contact-avatar">{lead.contactName[0]}</div>
            <div>
              <div className="contact-card-name">{lead.contactName}</div>
              <div className="contact-card-title">{lead.contactTitle}</div>
            </div>
            <a className="linkedin-link" href={lead.linkedinUrl} target="_blank" rel="noreferrer">
              in LinkedIn
            </a>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Intro bericht</div>
          <div className="message-box">{lead.message}</div>
          <button className="copy-btn" type="button" onClick={copyMessage}>
            {copied ? "✓ Gekopieerd!" : "Kopieer bericht"}
          </button>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Status wijzigen</div>
          <div className="status-buttons">
            {(["nieuw", "bekeken", "verstuurd", "opvolgen", "gewonnen", "verloren"] as LeadStatus[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-btn${lead.status === s ? " active-s" : ""}`}
                  onClick={() => setStatus(s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              )
            )}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Notities</div>
          <textarea
            className="notes-input"
            placeholder="Voeg een notitie toe..."
            defaultValue={lead.notes}
            onChange={(e) => updateLead(lead.id, { notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
