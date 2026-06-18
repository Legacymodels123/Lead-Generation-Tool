import type { KeyboardEvent } from "react";
import type { Lead } from "./types";

export interface CellAddress {
  rowKey: string;
  colId: string;
}

export interface NavRow {
  rowKey: string;
  cols: string[];
}

const ACCOUNT_EDITABLE = new Set(["company", "market", "fitReason", "status"]);
const CONTACT_EDITABLE = new Set(["fitReason", "dmu", "email", "phone"]);

function accountEditableCols(visibleColumns: string[]): string[] {
  return visibleColumns.filter((id) => ACCOUNT_EDITABLE.has(id));
}

function contactEditableCols(visibleColumns: string[]): string[] {
  return visibleColumns.filter((id) => CONTACT_EDITABLE.has(id));
}

export function buildNavRows(leads: Lead[], visibleColumns: string[]): NavRow[] {
  const accountCols = accountEditableCols(visibleColumns);
  const contactCols = contactEditableCols(visibleColumns);
  const rows: NavRow[] = [];

  for (const lead of leads) {
    if (accountCols.length) {
      rows.push({ rowKey: lead.id, cols: accountCols });
    }
    if (lead.expanded) {
      for (const contact of lead.contacts ?? []) {
        if (contactCols.length) {
          rows.push({ rowKey: `${lead.id}:${contact.id}`, cols: contactCols });
        }
      }
    }
  }

  return rows;
}

export function findCellIndex(
  rows: NavRow[],
  cell: CellAddress
): { row: number; col: number } | null {
  const row = rows.findIndex((r) => r.rowKey === cell.rowKey);
  if (row < 0) return null;
  const col = rows[row].cols.indexOf(cell.colId);
  if (col < 0) return null;
  return { row, col };
}

export function moveCell(
  rows: NavRow[],
  current: CellAddress,
  deltaRow: number,
  deltaCol: number
): CellAddress | null {
  const pos = findCellIndex(rows, current);
  if (!pos) return rows[0]?.cols[0] ? { rowKey: rows[0].rowKey, colId: rows[0].cols[0] } : null;

  let { row, col } = pos;
  col += deltaCol;
  row += deltaRow;

  while (row >= 0 && row < rows.length) {
    const r = rows[row];
    if (col < 0) {
      row -= 1;
      if (row < 0) return null;
      col = rows[row].cols.length - 1;
      continue;
    }
    if (col >= r.cols.length) {
      row += 1;
      col = 0;
      continue;
    }
    return { rowKey: r.rowKey, colId: r.cols[col] };
  }

  return null;
}

export function focusGridCell(
  container: HTMLElement | null,
  cell: CellAddress
): HTMLElement | null {
  if (!container) return null;
  const td = container.querySelector(
    `td[data-row-key="${cell.rowKey}"][data-col-id="${cell.colId}"]`
  ) as HTMLElement | null;
  if (!td) return null;
  const focusable = td.querySelector<HTMLElement>("input, select, textarea");
  if (focusable) {
    focusable.focus();
    if (focusable instanceof HTMLInputElement && focusable.type === "text") {
      focusable.select();
    }
  } else {
    td.focus();
  }
  td.scrollIntoView({ block: "nearest", inline: "nearest" });
  return focusable ?? td;
}

export function handleGridInputKeyDown(
  e: KeyboardEvent,
  rows: NavRow[],
  cell: CellAddress,
  container: HTMLElement | null,
  onActiveChange: (cell: CellAddress) => void
): void {
  let deltaRow = 0;
  let deltaCol = 0;

  if (e.key === "Tab") {
    e.preventDefault();
    deltaCol = e.shiftKey ? -1 : 1;
  } else if (e.key === "Enter") {
    e.preventDefault();
    deltaRow = e.shiftKey ? -1 : 1;
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    deltaRow = 1;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    deltaRow = -1;
  } else if (e.key === "ArrowRight" && (e.ctrlKey || e.metaKey || isAtEnd(e.currentTarget))) {
    e.preventDefault();
    deltaCol = 1;
  } else if (e.key === "ArrowLeft" && (e.ctrlKey || e.metaKey || isAtStart(e.currentTarget))) {
    e.preventDefault();
    deltaCol = -1;
  } else {
    return;
  }

  const next = moveCell(rows, cell, deltaRow, deltaCol);
  if (!next) return;
  onActiveChange(next);
  requestAnimationFrame(() => focusGridCell(container, next));
}

function isAtEnd(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return true;
  return el.selectionStart === el.value.length;
}

function isAtStart(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return true;
  return el.selectionStart === 0;
}
