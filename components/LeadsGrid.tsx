"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Contact, CustomColumn, Lead, LeadStatus } from "@/lib/types";
import type { AiStatus } from "@/lib/types";
import { getDmuRoleLabel } from "@/lib/dmu/roles";
import type { GridColumnDef } from "@/lib/grid-columns";
import { isColumnVisibleForLead } from "@/lib/column-conditions";
import { customColumnGridId, findCustomColumn, mergeGridColumns } from "@/lib/merge-grid-columns";
import type { CellAddress } from "@/lib/grid-navigation";
import { BLANK_ROW_COUNT, isPhantomRowKey, PHANTOM_ROW_PREFIX } from "@/lib/grid-cell-data";
import { emptyLeadDefaults } from "@/lib/grid/lead-patch";
import { columnTypeIcon } from "@/lib/grid-column-icons";
import type { SortDir, SortField } from "@/lib/views";
import { scoreColor } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import ExcelCell from "@/components/ExcelCell";
import { useGridExcel } from "@/hooks/useGridExcel";

function AiCellContent({ status, value }: { status?: AiStatus; value?: string }) {
  if (status === "running") {
    return (
      <span className="ai-status ai-running" title="Processing">
        <span className="ai-spinner" /> Processing...
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
  return <span className="ai-empty">Processing...</span>;
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
  | "instantly"
  | `custom:${string}`
  | `research:${string}`;

export type ColumnRunScope = "selection" | "first1" | "first10" | "first100";

interface Props {
  leads: Lead[];
  visibleColumns: string[];
  customColumns?: CustomColumn[];
  sort?: { field: SortField; dir: SortDir };
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelectRow: (id: string) => void;
  onToggleSelect: (id: string, shiftKey?: boolean) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onUpdate: (id: string, updates: Partial<Lead>, immediate?: boolean) => void;
  onUpdateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
  onToggleExpand: (id: string) => void;
  onAddRow: () => Promise<string | null>;
  onCreateLead?: (lead: Omit<Lead, "id" | "workspaceId">) => Promise<string | null>;
  onCopyMessage: (id: string) => void;
  onSort: (field: SortField) => void;
  onColumnAction: (action: ColumnAction, scope?: ColumnRunScope) => void;
  onRowAction: (action: ColumnAction, leadId: string) => void;
  onOpenColumnProperty?: (colId: string) => void;
  onHideColumn?: (colId: string) => void;
  scrollToLeadId?: string | null;
  onScrolledToLead?: () => void;
  recordCount?: number;
}

function ColumnHeaderMenu({
  col,
  sort,
  onSort,
  onAction,
  onOpenProperty,
  onHideColumn,
}: {
  col: GridColumnDef;
  sort?: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
  onAction: (action: ColumnAction, scope?: ColumnRunScope) => void;
  onOpenProperty?: (colId: string) => void;
  onHideColumn?: (colId: string) => void;
}) {
  const [runOpen, setRunOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSorted = sort?.field === col.id;
  const sortIndicator = isSorted ? (sort!.dir === "asc" ? " ^" : " v") : "";
  const isCustom = col.id.startsWith("custom:");
  const icons = columnTypeIcon(col);

  return (
    <th className={`smooth-header-cell ${col.id === "company" ? "smooth-company-col" : ""} ${col.className ?? ""}`}>
      <div className="col-header smooth-col-header">
        <span className="col-type-icons" aria-hidden>
          <span className="col-type-glyph">{icons.glyph}</span>
          {icons.extra && <span className="col-type-extra">{icons.extra}</span>}
        </span>
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
        <div className="col-header-menu">
          {(col.core || col.isCustom) && onHideColumn && (
            <button
              type="button"
              className="col-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Column options"
            >
              ?
            </button>
          )}
          {menuOpen && (
            <div className="col-run-dropdown col-header-dropdown">
              {isCustom && onOpenProperty && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenProperty(col.id);
                    setMenuOpen(false);
                  }}
                >
                  Edit property
                </button>
              )}
              {onHideColumn && (
                <button
                  type="button"
                  onClick={() => {
                    onHideColumn(col.id);
                    setMenuOpen(false);
                  }}
                >
                  Hide column
                </button>
              )}
            </div>
          )}
          {col.automatable && (
            <>
              <button
                type="button"
                className="col-run-btn col-play-btn"
                onClick={() => setRunOpen(!runOpen)}
                title="Run column"
              >
                ?
              </button>
              {runOpen && (
                <div className="col-run-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      onAction(col.automatable as ColumnAction, "first1");
                      setRunOpen(false);
                    }}
                  >
                    First row
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAction(col.automatable as ColumnAction, "first10");
                      setRunOpen(false);
                    }}
                  >
                    First 10 rows
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAction(col.automatable as ColumnAction, "first100");
                      setRunOpen(false);
                    }}
                  >
                    First 100 rows
                  </button>
                  <div className="col-run-dropdown-sep" />
                  <button
                    type="button"
                    onClick={() => {
                      onAction(col.automatable as ColumnAction, "selection");
                      setRunOpen(false);
                    }}
                  >
                    Run on selection
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </th>
  );
}

export default function LeadsGrid({
  leads,
  visibleColumns,
  customColumns = [],
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
  onCreateLead,
  onCopyMessage,
  onSort,
  onColumnAction,
  onRowAction,
  onOpenColumnProperty,
  onHideColumn,
  scrollToLeadId,
  onScrolledToLead,
  recordCount,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const headerCheckRef = useRef<HTMLInputElement>(null);
  const [phantomMap, setPhantomMap] = useState<Record<string, string>>({});
  const phantomPendingRef = useRef(new Map<string, Promise<string>>());

  const ensurePhantomLead = useCallback(
    async (phantomKey: string, initialPatch?: Partial<Lead>): Promise<string> => {
      const existing = phantomMap[phantomKey];
      if (existing) {
        if (initialPatch && Object.keys(initialPatch).length > 0) {
          onUpdate(existing, initialPatch, true);
        }
        return existing;
      }
      const pending = phantomPendingRef.current.get(phantomKey);
      if (pending) return pending;

      const promise = (async () => {
        const payload = { ...emptyLeadDefaults(), ...initialPatch };
        const id = onCreateLead
          ? await onCreateLead(payload)
          : await onAddRow();
        if (!id) throw new Error("Could not create company");
        setPhantomMap((prev) => ({ ...prev, [phantomKey]: id }));
        phantomPendingRef.current.delete(phantomKey);
        return id;
      })();
      phantomPendingRef.current.set(phantomKey, promise);
      return promise;
    },
    [onAddRow, onCreateLead, onUpdate, phantomMap]
  );

  const writers = useMemo(
    () => ({
      onUpdate: (id: string, updates: Partial<Lead>) => {
        if (isPhantomRowKey(id)) {
          void ensurePhantomLead(id, updates).catch(() => {
            /* store shows errors */
          });
          return;
        }
        onUpdate(id, updates, true);
      },
      onUpdateContact,
    }),
    [onUpdate, onUpdateContact, ensurePhantomLead]
  );

  const accountExtraEditable = useMemo(
    () =>
      customColumns
        .filter((c) => c.type === "text" || c.type === "select")
        .map((c) => customColumnGridId(c)),
    [customColumns]
  );

  const excel = useGridExcel({
    leads,
    visibleColumns,
    customColumns,
    accountExtraEditable,
    writers,
    gridRef,
  });

  useEffect(() => {
    if (!scrollToLeadId || !gridRef.current) return;
    const row = gridRef.current.querySelector(`tr.grid-row.account-row`);
    const rows = gridRef.current.querySelectorAll(`tr.grid-row.account-row`);
    const idx = leads.findIndex((l) => l.id === scrollToLeadId);
    const target = rows[idx] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      onScrolledToLead?.();
    }
  }, [scrollToLeadId, leads, onScrolledToLead]);

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
        value={value}
        editSeed={editing ? excel.getEditSeed(cell) : undefined}
        displayValue={opts?.displayValue}
        type={opts?.type}
        options={opts?.options}
        prefix={opts?.prefix}
        className={opts?.className}
        {...excel.cellState(rowKey, colId)}
        isEditing={editing}
        onSelect={excel.selectCell}
        onStartEdit={excel.startEdit}
        onCommit={(v) => excel.commitEdit(v)}
        onLiveCommit={(v) => excel.liveCommit(v)}
        onCancel={excel.cancelEdit}
        onInputKeyDown={excel.bindInputKeys}
        onFillHandleMouseDown={excel.onFillHandleMouseDown}
        onDragStart={excel.onDragStart}
        onDragEnter={excel.onDragEnter}
      />
    );
  };

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someSelected = leads.some((l) => selectedIds.has(l.id)) && !allSelected;

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const allGridColumns = useMemo(() => mergeGridColumns(customColumns), [customColumns]);
  const cols = visibleColumns
    .map((id) => allGridColumns.find((c) => c.id === id))
    .filter((c): c is GridColumnDef => Boolean(c));
  const colSpan = 2 + cols.length;

  function renderAccountCell(colId: string, lead: Lead, phantom = false) {
    const score = lead.score ?? 0;
    const color = scoreColor(score);
    const contactCount = lead.contacts?.length ?? 0;
    const mappedId = phantom ? phantomMap[lead.id] : undefined;
    const displayLead = mappedId ? leads.find((l) => l.id === mappedId) ?? lead : lead;
    const rowKey = mappedId ?? lead.id;

    if (phantom) {
      const editable = new Set([
        "company",
        "sector",
        "city",
        "country",
        "website",
        "market",
        "fitReason",
        "status",
      ]);
      const custom = findCustomColumn(customColumns, colId);
      if (editable.has(colId) || (custom && (custom.type === "text" || custom.type === "select"))) {
        switch (colId) {
          case "company":
            return ec(rowKey, colId, displayLead.company ?? "", {
              className: "excel-cell-bold smooth-company-col",
            });
          case "sector":
            return ec(rowKey, colId, displayLead.sector ?? "");
          case "city":
            return ec(rowKey, colId, displayLead.city ?? "");
          case "country":
            return ec(rowKey, colId, displayLead.country ?? "");
          case "website":
            return ec(rowKey, colId, displayLead.website ?? "", {
              className: "excel-cell-url",
            });
          case "market":
            return ec(rowKey, colId, displayLead.market ?? "");
          case "fitReason":
            return ec(rowKey, colId, displayLead.fitReason ?? "");
          case "status":
            return ec(rowKey, colId, displayLead.status ?? "not_qualified", {
              type: "select",
              options: STATUS_OPTIONS,
              displayValue: STATUS_LABELS[displayLead.status ?? "not_qualified"],
            });
          default:
            if (custom?.type === "select") {
              const val = displayLead.customValues?.[custom.key] ?? "";
              return ec(rowKey, colId, val, {
                type: "select",
                options: (custom.selectOptions ?? []).map((o) => ({ value: o, label: o })),
              });
            }
            if (custom) {
              return ec(rowKey, colId, displayLead.customValues?.[custom.key] ?? "");
            }
            return ec(rowKey, colId, "");
        }
      }
      return (
        <td key={colId} className="excel-cell-blank">
          <span className="excel-cell-display" />
        </td>
      );
    }

    switch (colId) {
      case "company":
        return ec(lead.id, colId, lead.company, {
          className: "excel-cell-bold smooth-company-col",
        });
      case "sector":
        return ec(rowKey, colId, lead.sector);
      case "city":
        return ec(rowKey, colId, lead.city ?? "");
      case "country":
        return ec(rowKey, colId, lead.country);
      case "website":
        return ec(rowKey, colId, lead.website, { className: "excel-cell-url" });
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
            <span className="batch-cell">{lead.batch || "-"}</span>
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
              <span className="hs-badge hs-synced" title="Synced to HubSpot">OK</span>
            ) : (
              <span className="hs-badge hs-pending" title="Not synced">-</span>
            )}
          </td>
        );
      default: {
        const custom = findCustomColumn(customColumns, colId);
        if (!custom) return <td key={colId} className="excel-readonly" />;
        if (!isColumnVisibleForLead(custom, lead)) {
          return <td key={colId} className="excel-readonly excel-cell-hidden" />;
        }
        const val = lead.customValues?.[custom.key] ?? "";
        if (custom.type === "select") {
          return ec(rowKey, colId, val, {
            type: "select",
            options: (custom.selectOptions ?? []).map((o) => ({ value: o, label: o })),
          });
        }
        if (custom.type === "ai_enriched") {
          return (
            <td key={colId} className="ai-cell excel-readonly" onClick={() => onSelectRow(lead.id)}>
              <AiCellContent value={val} />
            </td>
          );
        }
        return ec(rowKey, colId, val);
      }
    }
  }

  return (
    <div className="smooth-sheet">
      <div
        ref={gridRef}
        className="smooth-grid-wrap"
        tabIndex={0}
        onKeyDown={excel.handleGridKeyDown}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("input, select, textarea, .excel-cell-editor")) {
            e.stopPropagation();
          }
        }}
      >
        <table className="leads-grid smooth-grid">
          <thead>
            <tr>
              <th className="smooth-row-num-col">#</th>
              <th className="smooth-check-col">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleSelectAll(leads.map((l) => l.id))}
                  aria-label="Select all"
                />
              </th>
              <th className="smooth-open-col" aria-label="Expand" />
              {cols.map((col) => (
                <ColumnHeaderMenu
                  key={col.id}
                  col={col}
                  sort={sort}
                  onSort={onSort}
                  onAction={onColumnAction}
                  onOpenProperty={onOpenColumnProperty}
                  onHideColumn={onHideColumn}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, rowIndex) => {
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
                    <td className="smooth-row-num-col">{rowIndex + 1}</td>
                    <td className="smooth-check-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onClick={(e) => onToggleSelect(lead.id, e.shiftKey)}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="smooth-open-col" onClick={(e) => e.stopPropagation()}>
                      {contactCount > 0 && (
                        <button
                          type="button"
                          className={`row-open-btn${lead.expanded ? " expanded" : ""}`}
                          onClick={() => onToggleExpand(lead.id)}
                          aria-label={lead.expanded ? "Collapse row" : "Expand row"}
                        >
                          &gt;
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
                          <td className="smooth-row-num-col" />
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
                            if (col.id.startsWith("custom:")) {
                              return <td key={col.id} className="excel-readonly" />;
                            }
                            return <td key={col.id} className="excel-readonly" />;
                          })}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
            {Array.from({ length: BLANK_ROW_COUNT }).map((_, i) => {
              const phantomId = `${PHANTOM_ROW_PREFIX}${i}`;
              const phantomLead = { id: phantomId } as Lead;
              return (
                <tr key={phantomId} className="grid-row account-row blank-row">
                  <td className="smooth-row-num-col">{leads.length + i + 1}</td>
                  <td className="smooth-check-col" />
                  <td className="smooth-open-col" />
                  {cols.map((col) => renderAccountCell(col.id, phantomLead, true))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="smooth-grid-footer">
        <button type="button" className="smooth-add-row" onClick={() => void onAddRow()}>
          + Add row
        </button>
        <span className="smooth-record-count">{recordCount ?? leads.length} records</span>
      </div>
    </div>
  );
}
