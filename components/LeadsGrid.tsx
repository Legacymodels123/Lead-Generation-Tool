"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import type { Contact, Lead, LeadStatus } from "@/lib/types";
import type { AiStatus } from "@/lib/types";
import { getDmuRoleLabel } from "@/lib/dmu/roles";
import { GRID_COLUMNS, type GridColumnDef } from "@/lib/grid-columns";
import type { CellAddress } from "@/lib/grid-navigation";
import { colIndexToLetter } from "@/lib/grid-navigation";
import type { SortDir, SortField } from "@/lib/views";
import { FLAGS, scoreColor } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import ExcelCell from "@/components/ExcelCell";
import { useGridExcel } from "@/hooks/useGridExcel";

function AiCellContent({ status, value }: { status?: AiStatus; value?: string }) {
  if (status === "running") {
    return (
      <span className="ai-status ai-running" title="AI running">
        <span className="ai-spinner" /> ?
      </span>
    );
  }
  if (status === "error") return <span className="ai-status ai-error">Error</span>;
  if (value) {
    return (
      <span className="ai-text" title={value}>
        {value}
      </span>
    );
  }
  return <span className="ai-empty">?</span>;
}

const STATUSES: LeadStatus[] = ["qualified", "not_qualified"];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

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
    <th className={`excel-header-cell ${col.className ?? ""}`}>
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
            <button type="button" className="col-run-btn" onClick={() => setOpen(!open)} title="Run">
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
                  Run on selection
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
  const writers = useMemo(() => ({ onUpdate, onUpdateContact }), [onUpdate, onUpdateContact]);

  const excel = useGridExcel({ leads, visibleColumns, writers, gridRef });

  const ec = (
    rowKey: string,
    colId: string,
    value: string,
    opts?: {
      type?: "text" | "select";
      options?: { value: string; label: string }[];
      displayValue?: string;
      prefix?: React.ReactNode;
      className?: string;
    }
  ) => {
    const cell: CellAddress = { rowKey, colId };
    const editing = excel.isEditing(cell);
    return (
      <ExcelCell
        key={colId}
        cell={cell}
        value={editing ? excel.editDraft : value}
        displayValue={opts?.displayValue}
        type={opts?.type}
        options={opts?.options}
        prefix={opts?.prefix}
        className={opts?.className}
        {...excel.cellState(rowKey, colId)}
        isEditing={editing}
        onSelect={excel.selectCell}
        onStartEdit={excel.startEdit}
        onDraftChange={excel.setEditDraft}
        onCommit={excel.commitEdit}
        onCancel={excel.cancelEdit}
        onInputKeyDown={excel.bindInputKeys}
        onFillHandleMouseDown={excel.onFillHandleMouseDown}
        onDragStart={excel.onDragStart}
        onDragEnter={excel.onDragEnter}
      />
    );
  };

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const cols = visibleColumns
    .map((id) => GRID_COLUMNS.find((c) => c.id === id))
    .filter((c): c is GridColumnDef => Boolean(c));
  const colSpan = 3 + cols.length;

  function renderAccountCell(colId: string, lead: Lead) {
    const score = lead.score ?? 0;
    const color = scoreColor(score);
    const contactCount = lead.contacts?.length ?? 0;
    const rowKey = lead.id;

    switch (colId) {
      case "company":
        return ec(lead.id, colId, lead.company, {
          className: "excel-cell-bold",
          prefix: <span className="company-flag">{FLAGS[lead.country] ?? "??"}</span>,
        });
      case "market":
        return ec(rowKey, colId, lead.market);
      case "fitReason":
        return ec(rowKey, colId, lead.fitReason);
      case "dmu":
        return (
          <td key={colId} className="excel-readonly" onClick={() => onSelectRow(lead.id)}>
            <span className="dmu-count">{contactCount} DMU</span>
          </td>
        );
      case "email":
      case "phone":
        return <td key={colId} className="excel-readonly" />;
      case "score":
        return (
          <td key={colId} className="excel-readonly" onClick={() => onSelectRow(lead.id)}>
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
        return ec(rowKey, colId, lead.status, {
          type: "select",
          options: STATUS_OPTIONS,
          displayValue: STATUS_LABELS[lead.status],
        });
      case "batch":
        return (
          <td key={colId} className="excel-readonly" onClick={() => onSelectRow(lead.id)}>
            <span className="batch-cell">{lead.batch || "?"}</span>
          </td>
        );
      case "aiSummary":
      case "aiMessage":
      case "aiNextStep":
        return (
          <td key={colId} className="ai-cell excel-readonly" onClick={() => onSelectRow(lead.id)}>
            <AiCellContent
              status={lead.aiStatus}
              value={colId === "aiSummary" ? lead.aiSummary : colId === "aiMessage" ? lead.aiMessage : lead.aiNextStep}
            />
          </td>
        );
      case "hubspot":
        return (
          <td key={colId} className="excel-readonly" onClick={() => onSelectRow(lead.id)}>
            {lead.hubspotCompanyId ? (
              <span className="hs-badge hs-synced">?</span>
            ) : (
              <span className="hs-badge hs-pending">?</span>
            )}
          </td>
        );
      case "actions":
        return (
          <td key={colId} className="excel-readonly" onClick={(e) => e.stopPropagation()}>
            <div className="actions-cell">
              <button type="button" className="action-btn" onClick={() => onCopyMessage(lead.id)}>
                ?
              </button>
              <button type="button" className="action-btn" onClick={() => onRowAction("hubspot", lead.id)}>
                HS
              </button>
            </div>
          </td>
        );
      default:
        return <td key={colId} className="excel-readonly" />;
    }
  }

  let visualRow = 0;

  return (
    <div className="excel-sheet">
      <div className="excel-formula-bar">
        <span className="excel-name-box">{excel.cellRef || "?"}</span>
        <span className="excel-fx">fx</span>
        <input
          className="excel-formula-input"
          value={excel.formulaValue}
          placeholder="Select a cell or start typing?"
          onChange={(e) => excel.onFormulaChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              excel.onFormulaCommit();
            }
            if (e.key === "Escape") excel.cancelEdit();
          }}
          onBlur={excel.onFormulaCommit}
        />
      </div>

      <div
        ref={gridRef}
        className="table-wrap table-wrap-sticky sheet-grid-wrap excel-grid-wrap"
        tabIndex={0}
        onKeyDown={excel.handleGridKeyDown}
      >
        <table className="leads-grid excel-grid">
          <thead>
            <tr className="excel-letters-row">
              <th colSpan={3} className="excel-corner" />
              {cols.map((col, i) => (
                <th key={col.id} className="excel-col-letter">
                  {colIndexToLetter(i)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="excel-row-head">#</th>
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
                  <th key={col.id} className="excel-header-cell">
                    {col.label}
                  </th>
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
                  No rows ? press + New row or import CSV
                </td>
              </tr>
            )}
            {leads.map((lead) => {
              visualRow += 1;
              const rowNum = visualRow;
              const contactCount = lead.contacts?.length ?? 0;
              const showEmail = visibleColumns.includes("email");
              const showPhone = visibleColumns.includes("phone");

              return (
                <Fragment key={lead.id}>
                  <tr
                    className={`grid-row account-row${selectedId === lead.id ? " selected" : ""}${
                      selectedIds.has(lead.id) ? " checked" : ""
                    }`}
                  >
                    <td className="excel-row-num">{rowNum}</td>
                    <td className="grid-check-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => onToggleSelect(lead.id)}
                      />
                    </td>
                    <td className="grid-expand-col" onClick={(e) => e.stopPropagation()}>
                      {contactCount > 0 && (
                        <button
                          type="button"
                          className="expand-btn"
                          onClick={() => onToggleExpand(lead.id)}
                        >
                          {lead.expanded ? "?" : "?"}
                        </button>
                      )}
                    </td>
                    {cols.map((col) => renderAccountCell(col.id, lead))}
                  </tr>
                  {lead.expanded &&
                    lead.contacts.map((contact) => {
                      visualRow += 1;
                      const contactRowNum = visualRow;
                      const rowKey = `${lead.id}:${contact.id}`;
                      return (
                        <tr key={contact.id} className="grid-row contact-row">
                          <td className="excel-row-num">{contactRowNum}</td>
                          <td />
                          <td />
                          {cols.map((col) => {
                            if (col.id === "company") {
                              return (
                                <td
                                  key={col.id}
                                  colSpan={visibleColumns.includes("market") ? 2 : 1}
                                  className="excel-readonly"
                                >
                                  <span className="dmu-role-badge">
                                    {getDmuRoleLabel(contact.dmuRole)}
                                  </span>
                                </td>
                              );
                            }
                            if (col.id === "market" && !visibleColumns.includes("company")) {
                              return (
                                <td key={col.id} className="excel-readonly">
                                  <span className="dmu-role-badge">
                                    {getDmuRoleLabel(contact.dmuRole)}
                                  </span>
                                </td>
                              );
                            }
                            if (col.id === "market") return null;
                            if (col.id === "fitReason") return ec(rowKey, col.id, contact.name);
                            if (col.id === "dmu") return ec(rowKey, col.id, contact.title);
                            if (col.id === "email" && showEmail) {
                              return ec(rowKey, col.id, contact.email);
                            }
                            if (col.id === "phone" && showPhone) {
                              return ec(rowKey, col.id, contact.phone);
                            }
                            if (col.id === "score") {
                              return (
                                <td
                                  key={col.id}
                                  colSpan={visibleColumns.includes("status") ? 2 : 1}
                                  className="excel-readonly"
                                >
                                  <span className={`enrich-status enrich-${contact.enrichmentStatus}`}>
                                    {contact.enrichmentStatus}
                                  </span>
                                </td>
                              );
                            }
                            if (col.id === "status" && !visibleColumns.includes("score")) {
                              return (
                                <td key={col.id} className="excel-readonly">
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
                                <td key={col.id} className="ai-cell excel-readonly">
                                  <AiCellContent value={val} />
                                </td>
                              );
                            }
                            if (col.id === "actions") {
                              return (
                                <td key={col.id} className="excel-readonly">
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
                            return <td key={col.id} className="excel-readonly" />;
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
    </div>
  );
}
