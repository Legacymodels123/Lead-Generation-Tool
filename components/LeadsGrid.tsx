"use client";

import { Fragment } from "react";
import type { Contact, Lead, LeadStatus } from "@/lib/types";
import type { AiStatus } from "@/lib/types";
import { getDmuRoleLabel } from "@/lib/dmu/roles";
import { FLAGS, STATUS_LABELS, scoreColor } from "@/lib/utils";

function AiCellContent({ status, value }: { status?: AiStatus; value?: string }) {
  if (status === "running") {
    return (
      <span className="ai-status ai-running" title="AI bezig…">
        <span className="ai-spinner" /> Bezig…
      </span>
    );
  }
  if (status === "error") {
    return <span className="ai-status ai-error">Fout</span>;
  }
  if (value) {
    return (
      <span className="ai-text" title={value}>
        {value}
      </span>
    );
  }
  return <span className="ai-empty">—</span>;
}

function confidenceBadge(confidence?: Contact["emailConfidence"]) {
  if (!confidence) return null;
  const cls =
    confidence === "high" ? "conf-high" : confidence === "medium" ? "conf-med" : "conf-low";
  return <span className={`conf-badge ${cls}`}>{confidence}</span>;
}

const STATUSES: LeadStatus[] = [
  "nieuw",
  "bekeken",
  "verstuurd",
  "opvolgen",
  "gewonnen",
  "verloren",
];

interface Props {
  leads: Lead[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelectRow: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onUpdateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
  onToggleExpand: (id: string) => void;
  onAddRow: () => void;
  onCopyMessage: (id: string) => void;
}

export default function LeadsGrid({
  leads,
  selectedId,
  selectedIds,
  onSelectRow,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
  onUpdateContact,
  onToggleExpand,
  onAddRow,
  onCopyMessage,
}: Props) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  return (
    <div className="table-wrap">
      <table className="leads-grid">
        <thead>
          <tr>
            <th className="grid-check-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(leads.map((l) => l.id))}
                aria-label="Selecteer alles"
              />
            </th>
            <th className="grid-expand-col" />
            <th>Bedrijf</th>
            <th>Markt</th>
            <th>Waarom fit</th>
            <th>DMU / Contact</th>
            <th>E-mail</th>
            <th>Telefoon</th>
            <th>Fit score</th>
            <th>Status</th>
            <th className="ai-col">AI Samenvatting</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={12} className="grid-empty">
                Geen leads gevonden — voeg een rij toe of importeer LinkedIn CSV
              </td>
            </tr>
          )}
          {leads.map((lead) => {
            const score = lead.score ?? 0;
            const color = scoreColor(score);
            const contactCount = lead.contacts?.length ?? 0;

            return (
              <Fragment key={lead.id}>
                <tr
                  key={lead.id}
                  className={`grid-row account-row${selectedId === lead.id ? " selected" : ""}${
                    selectedIds.has(lead.id) ? " checked" : ""
                  }`}
                >
                  <td className="grid-check-col" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => onToggleSelect(lead.id)}
                      aria-label={`Selecteer ${lead.company}`}
                    />
                  </td>
                  <td className="grid-expand-col" onClick={(e) => e.stopPropagation()}>
                    {contactCount > 0 && (
                      <button
                        type="button"
                        className="expand-btn"
                        onClick={() => onToggleExpand(lead.id)}
                        aria-label="Toon DMU contacten"
                      >
                        {lead.expanded ? "▼" : "▶"}
                      </button>
                    )}
                  </td>
                  <td onClick={() => onSelectRow(lead.id)}>
                    <div className="company-cell">
                      <div className="company-flag">{FLAGS[lead.country] ?? "🌍"}</div>
                      <input
                        className="grid-input grid-input-bold"
                        value={lead.company}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdate(lead.id, { company: e.target.value })}
                      />
                    </div>
                  </td>
                  <td onClick={() => onSelectRow(lead.id)}>
                    <input
                      className="grid-input"
                      value={lead.market}
                      placeholder="Markt"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(lead.id, { market: e.target.value })}
                    />
                  </td>
                  <td onClick={() => onSelectRow(lead.id)}>
                    <input
                      className="grid-input grid-fit"
                      value={lead.fitReason}
                      placeholder="Waarom fit voor ons?"
                      title={lead.fitReason}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(lead.id, { fitReason: e.target.value })}
                    />
                  </td>
                  <td onClick={() => onSelectRow(lead.id)}>
                    <span className="dmu-count">{contactCount} DMU</span>
                  </td>
                  <td colSpan={2} />
                  <td onClick={() => onSelectRow(lead.id)}>
                    <div className="score-wrap">
                      <div className="score-bar-bg">
                        <div
                          className="score-bar"
                          style={{ width: `${score}%`, background: color }}
                        />
                      </div>
                      <span className="score-num" style={{ color }}>
                        {score}%
                      </span>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="grid-select"
                      value={lead.status}
                      onChange={(e) =>
                        onUpdate(lead.id, { status: e.target.value as LeadStatus })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ai-cell" onClick={() => onSelectRow(lead.id)}>
                    <AiCellContent status={lead.aiStatus} value={lead.aiSummary} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => onCopyMessage(lead.id)}
                      >
                        Kopieer
                      </button>
                      {lead.hubspotCompanyId && (
                        <span className="hs-badge" title="In HubSpot">
                          HS
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {lead.expanded &&
                  lead.contacts.map((contact) => (
                    <tr key={contact.id} className="grid-row contact-row">
                      <td />
                      <td />
                      <td colSpan={2}>
                        <span className="dmu-role-badge">{getDmuRoleLabel(contact.dmuRole)}</span>
                      </td>
                      <td>
                        <input
                          className="grid-input"
                          value={contact.name}
                          placeholder="Naam"
                          onChange={(e) =>
                            onUpdateContact(lead.id, contact.id, { name: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="grid-input"
                          value={contact.title}
                          placeholder="Functie"
                          onChange={(e) =>
                            onUpdateContact(lead.id, contact.id, { title: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <div className="email-cell">
                          <input
                            className="grid-input"
                            value={contact.email}
                            placeholder="E-mail"
                            onChange={(e) =>
                              onUpdateContact(lead.id, contact.id, { email: e.target.value })
                            }
                          />
                          {confidenceBadge(contact.emailConfidence)}
                        </div>
                      </td>
                      <td>
                        <input
                          className="grid-input"
                          value={contact.phone}
                          placeholder="Telefoon"
                          onChange={(e) =>
                            onUpdateContact(lead.id, contact.id, { phone: e.target.value })
                          }
                        />
                      </td>
                      <td colSpan={2}>
                        <span
                          className={`enrich-status enrich-${contact.enrichmentStatus}`}
                        >
                          {contact.enrichmentStatus}
                        </span>
                      </td>
                      <td className="ai-cell">
                        <AiCellContent value={contact.aiSummary} />
                      </td>
                      <td>
                        {contact.linkedinUrl && (
                          <a
                            className="action-btn linkedin"
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            in
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="grid-add-row" onClick={onAddRow}>
        + Nieuwe rij
      </button>
    </div>
  );
}
