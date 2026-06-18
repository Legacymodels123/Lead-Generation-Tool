"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import type { Contact, Lead, LeadStatus } from "@/lib/types";
import type { AiStatus } from "@/lib/types";
import { getDmuRoleLabel } from "@/lib/dmu/roles";
import { GRID_COLUMNS, type GridColumnDef } from "@/lib/grid-columns";
import type { CellAddress } from "@/lib/grid-navigation";
import type { SortDir, SortField } from "@/lib/views";
import { FLAGS, scoreColor } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import GridCell from "@/components/GridCell";
import { useGridExcel } from "@/hooks/useGridExcel";

function AiCellContent({ status, value }: { status?: AiStatus; value?: string }) {
  if (status === "running") {
    return (
      <span className="ai-status ai-running" title="AI running">
        <span className="ai-spinner" /> Running
      </span>
    );
  }
  if (status === "error") {
    return <span className="ai-status ai-error">Error</span>;
  }
  if (value) {
    return (
      <span className="ai-text" title={value}>
        {value}
      </span>
    );
  }
  return <span className="ai-empty">?</span>;
}

function confidenceBadge(confidence?: Contact["emailConfidence"], provider?: string) {
  if (!confidence && !provider) return null;
  const cls =
    confidence === "high" ? "conf-high" : confidence === "medium" ? "conf-med" : "conf-low";
  const label = provider ? `${provider}` : confidence;
  return (
    <span className={`conf-badge ${cls}`} title={provider}>
      {label}
    </span>
  );
}

const STATUSES: LeadStatus[] = ["qualified", "not_qualified"];

export type ColumnAction =
  | "score"
  | "enrich"
  | "aiMessage"
  | "aiSummary"
  | "aiNextStep"
  | "hubspot"
  | "instantly";

interface Props {
  leads: Lead[];
  visibleColumns: string[];
  sort?: { field: SortField; dir: SortDir };
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
  onSort: (field: SortField) => void;
  onColumnAction: (action: ColumnAction) => void;
  onRowAction: (action: ColumnAction, leadId: string) => void;
}

function ColumnHeaderMenu({
  col,
  sort,
  onSort,
  onAction,
}: {
  col: GridColumnDef;
  sort?: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
  onAction: (action: ColumnAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSorted = sort?.field === col.id;
  const sortIndicator = isSorted ? (sort!.dir === "asc" ? " ?" : " ?") : "";

  return (
    <th className={col.className}>
      <div className="col-header">
        {col.sortable ? (
          <button
            type="button"
            className="col-header-label sortable"
            onClick={() => onSort(col.id as SortField)}
          >
            {col.label}
            {sortIndicator}
          </button>
        ) : (
          <span className="col-header-label">{col.label}</span>
        )}
        {col.automatable && (
          <div className="col-header-menu">
            <button
              type="button"
              className="col-run-btn"
              onClick={() => setOpen(!open)}
              title="Run column"
            >
              ?
            </button>
            {open && (
              <div className="col-run-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    onAction(col.automatable as ColumnAction);
                    setOpen(false);
                  }}
                >
                  Run on selected / filtered rows
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export default function LeadsGrid({
  leads,
  visibleColumns,
  sort,
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
  onSort,
  onColumnAction,
  onRowAction,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const writers = useMemo(
    () => ({ onUpdate, onUpdateContact }),
    [onUpdate, onUpdateContact]
  );
  const {
    selectCell,
    cellState,
    onFillHandleMouseDown,
    handleGridKeyDown,
    bindInputKeys,
    onCellFocus,
  } = useGridExcel({ leads, visibleColumns, writers, gridRef });

  const cp = (rowKey: string, colId: string) => ({
    ...cellState(rowKey, colId),
    onActivate: selectCell,
    onFillHandleMouseDown,
  });

  const bind = (cell: CellAddress) => ({
    onFocus: () => onCellFocus(cell),
    onKeyDown: bindInputKeys(cell),
  });

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const cols = visibleColumns
    .map((id) => GRID_COLUMNS.find((c) => c.id === id))
    .filter((c): c is GridColumnDef => Boolean(c));
  const colSpan = 2 + cols.length;

  function renderAccountCell(colId: string, lead: Lead) {
    const score = lead.score ?? 0;
    const color = scoreColor(score);
    const contactCount = lead.contacts?.length ?? 0;
    const rowKey = lead.id;

    switch (colId) {
      case "company":
        return (
          <GridCell key={colId} rowKey={rowKey} colId={colId} {...cp(rowKey, colId)}>
            <div className="company-cell">
              <span className="company-flag">{FLAGS[lead.country] ?? "??"}</span>
              <input
                className="grid-input grid-input-bold"
                value={lead.company}
                {...bind({ rowKey, colId })}
                onChange={(e) => onUpdate(lead.id, { company: e.target.value })}
              />
            </div>
          </GridCell>
        );
      case "market":
        return (
          <GridCell key={colId} rowKey={rowKey} colId={colId} {...cp(rowKey, colId)}>
            <input
              className="grid-input"
              value={lead.market}
              placeholder="Market"
              {...bind({ rowKey, colId })}
              onChange={(e) => onUpdate(lead.id, { market: e.target.value })}
            />
          </GridCell>
        );
      case "fitReason":
        return (
          <GridCell key={colId} rowKey={rowKey} colId={colId} {...cp(rowKey, colId)}>
            <input
              className="grid-input grid-fit"
              value={lead.fitReason}
              placeholder="Why fit?"
              title={lead.fitReason}
              {...bind({ rowKey, colId })}
              onChange={(e) => onUpdate(lead.id, { fitReason: e.target.value })}
            />
          </GridCell>
        );
      case "dmu":
        return (
          <td key={colId} onClick={() => onSelectRow(lead.id)}>
            <span className="dmu-count">{contactCount} DMU</span>
          </td>
        );
      case "email":
      case "phone":
        return <td key={colId} />;
      case "score":
        return (
          <td key={colId} onClick={() => onSelectRow(lead.id)}>
            <div className="score-wrap">
              <div className="score-bar-bg">
                <div className="score-bar" style={{ width: `${score}%`, background: color }} />
              </div>
              <span className="score-num" style={{ color }}>
                {score}%
              </span>
            </div>
          </td>
        );
      case "status":
        return (
          <GridCell key={colId} rowKey={rowKey} colId={colId} {...cp(rowKey, colId)}>
            <select
              className="grid-select"
              value={lead.status}
              {...bind({ rowKey, colId })}
              onChange={(e) => onUpdate(lead.id, { status: e.target.value as LeadStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </GridCell>
        );
      case "batch":
        return (
          <td key={colId} onClick={() => onSelectRow(lead.id)}>
            <span className="batch-cell">{lead.batch || "?"}</span>
          </td>
        );
      case "aiSummary":
        return (
          <td key={colId} className="ai-cell" onClick={() => onSelectRow(lead.id)}>
            <AiCellContent status={lead.aiStatus} value={lead.aiSummary} />
          </td>
        );
      case "aiMessage":
        return (
          <td key={colId} className="ai-cell" onClick={() => onSelectRow(lead.id)}>
            <AiCellContent status={lead.aiStatus} value={lead.aiMessage} />
          </td>
        );
      case "aiNextStep":
        return (
          <td key={colId} className="ai-cell" onClick={() => onSelectRow(lead.id)}>
            <AiCellContent status={lead.aiStatus} value={lead.aiNextStep} />
          </td>
        );
      case "hubspot":
        return (
          <td key={colId} onClick={() => onSelectRow(lead.id)}>
            {lead.hubspotCompanyId ? (
              <span className="hs-badge hs-synced" title="Synced">
                ? Synced
              </span>
            ) : (
              <span className="hs-badge hs-pending">?</span>
            )}
          </td>
        );
      case "actions":
        return (
          <td key={colId} onClick={(e) => e.stopPropagation()}>
            <div className="actions-cell">
              <button type="button" className="action-btn" onClick={() => onCopyMessage(lead.id)}>
                Copy
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => onRowAction("hubspot", lead.id)}
                title="HubSpot sync"
              >
                HS
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => onRowAction("instantly", lead.id)}
                title="Instantly"
              >
                ?
              </button>
            </div>
          </td>
        );
      default:
        return <td key={colId} />;
    }
  }

  return (
    <div
      ref={gridRef}
      className="table-wrap table-wrap-sticky sheet-grid-wrap"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
    >
      <table className="leads-grid">
        <thead>
          <tr>
            <th className="grid-check-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(leads.map((l) => l.id))}
                aria-label="Select all"
              />
            </th>
            <th className="grid-expand-col" />
            {cols.map((col) =>
              col.id === "actions" ? (
                <th key={col.id}>{col.label}</th>
              ) : (
                <ColumnHeaderMenu
                  key={col.id}
                  col={col}
                  sort={sort}
                  onSort={onSort}
                  onAction={onColumnAction}
                />
              )
            )}
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="grid-empty">
                No rows ? add a row or import LinkedIn CSV
              </td>
            </tr>
          )}
          {leads.map((lead) => {
            const contactCount = lead.contacts?.length ?? 0;
            const showEmail = visibleColumns.includes("email");
            const showPhone = visibleColumns.includes("phone");

            return (
              <Fragment key={lead.id}>
                <tr
                  className={`grid-row account-row${selectedId === lead.id ? " selected" : ""}${
                    selectedIds.has(lead.id) ? " checked" : ""
                  }`}
                  onClick={() => onSelectRow(lead.id)}
                >
                  <td className="grid-check-col" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => onToggleSelect(lead.id)}
                      aria-label={`Select ${lead.company}`}
                    />
                  </td>
                  <td className="grid-expand-col" onClick={(e) => e.stopPropagation()}>
                    {contactCount > 0 && (
                      <button
                        type="button"
                        className="expand-btn"
                        onClick={() => onToggleExpand(lead.id)}
                        aria-label="Toggle DMU contacts"
                      >
                        {lead.expanded ? "?" : "?"}
                      </button>
                    )}
                  </td>
                  {cols.map((col) => renderAccountCell(col.id, lead))}
                </tr>
                {lead.expanded &&
                  lead.contacts.map((contact) => {
                    const rowKey = `${lead.id}:${contact.id}`;
                    return (
                      <tr key={contact.id} className="grid-row contact-row">
                        <td />
                        <td />
                        {cols.map((col) => {
                          if (col.id === "company") {
                            return (
                              <td key={col.id} colSpan={visibleColumns.includes("market") ? 2 : 1}>
                                <span className="dmu-role-badge">
                                  {getDmuRoleLabel(contact.dmuRole)}
                                </span>
                              </td>
                            );
                          }
                          if (col.id === "market" && !visibleColumns.includes("company")) {
                            return (
                              <td key={col.id}>
                                <span className="dmu-role-badge">
                                  {getDmuRoleLabel(contact.dmuRole)}
                                </span>
                              </td>
                            );
                          }
                          if (col.id === "market") return null;
                          if (col.id === "fitReason") {
                            return (
                              <GridCell
                                key={col.id}
                                rowKey={rowKey}
                                colId={col.id}
                                {...cp(rowKey, col.id)}
                              >
                                <input
                                  className="grid-input"
                                  value={contact.name}
                                  placeholder="Name"
                                  {...bind({ rowKey, colId: col.id })}
                                  onChange={(e) =>
                                    onUpdateContact(lead.id, contact.id, { name: e.target.value })
                                  }
                                />
                              </GridCell>
                            );
                          }
                          if (col.id === "dmu") {
                            return (
                              <GridCell
                                key={col.id}
                                rowKey={rowKey}
                                colId={col.id}
                                {...cp(rowKey, col.id)}
                              >
                                <input
                                  className="grid-input"
                                  value={contact.title}
                                  placeholder="Title"
                                  {...bind({ rowKey, colId: col.id })}
                                  onChange={(e) =>
                                    onUpdateContact(lead.id, contact.id, { title: e.target.value })
                                  }
                                />
                              </GridCell>
                            );
                          }
                          if (col.id === "email" && showEmail) {
                            return (
                              <GridCell
                                key={col.id}
                                rowKey={rowKey}
                                colId={col.id}
                                {...cp(rowKey, col.id)}
                              >
                                <div className="email-cell">
                                  <input
                                    className="grid-input"
                                    value={contact.email}
                                    placeholder="Email"
                                    {...bind({ rowKey, colId: col.id })}
                                    onChange={(e) =>
                                      onUpdateContact(lead.id, contact.id, {
                                        email: e.target.value,
                                      })
                                    }
                                  />
                                  {confidenceBadge(
                                    contact.emailConfidence,
                                    contact.enrichmentProvider
                                  )}
                                </div>
                              </GridCell>
                            );
                          }
                          if (col.id === "phone" && showPhone) {
                            return (
                              <GridCell
                                key={col.id}
                                rowKey={rowKey}
                                colId={col.id}
                                {...cp(rowKey, col.id)}
                              >
                                <input
                                  className="grid-input"
                                  value={contact.phone}
                                  placeholder="Phone"
                                  {...bind({ rowKey, colId: col.id })}
                                  onChange={(e) =>
                                    onUpdateContact(lead.id, contact.id, { phone: e.target.value })
                                  }
                                />
                              </GridCell>
                            );
                          }
                          if (col.id === "score") {
                            return (
                              <td key={col.id} colSpan={visibleColumns.includes("status") ? 2 : 1}>
                                <span className={`enrich-status enrich-${contact.enrichmentStatus}`}>
                                  {contact.enrichmentStatus}
                                </span>
                              </td>
                            );
                          }
                          if (col.id === "status" && !visibleColumns.includes("score")) {
                            return (
                              <td key={col.id}>
                                <span className={`enrich-status enrich-${contact.enrichmentStatus}`}>
                                  {contact.enrichmentStatus}
                                </span>
                              </td>
                            );
                          }
                          if (col.id === "status") return null;
                          if (
                            col.id === "aiSummary" ||
                            col.id === "aiMessage" ||
                            col.id === "aiNextStep"
                          ) {
                            const val =
                              col.id === "aiSummary"
                                ? contact.aiSummary
                                : col.id === "aiMessage"
                                  ? contact.aiMessage
                                  : contact.aiNextStep;
                            return (
                              <td key={col.id} className="ai-cell">
                                <AiCellContent value={val} />
                              </td>
                            );
                          }
                          if (col.id === "actions") {
                            return (
                              <td key={col.id}>
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
                            );
                          }
                          return <td key={col.id} />;
                        })}
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="grid-add-row" onClick={onAddRow}>
        + New row
      </button>
    </div>
  );
}
