import { getCellValue, setCellValue, type GridWriters } from "./grid-cell-data";
import type { Lead } from "./types";
import type { CellAddress, NavRow } from "./grid-navigation";
import { findCellIndex } from "./grid-navigation";

export interface CellSelection {
  anchor: CellAddress;
  focus: CellAddress;
}

export interface RangeBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export function getRangeBounds(
  rows: NavRow[],
  anchor: CellAddress,
  focus: CellAddress
): RangeBounds | null {
  const a = findCellIndex(rows, anchor);
  const f = findCellIndex(rows, focus);
  if (!a || !f) return null;
  return {
    minRow: Math.min(a.row, f.row),
    maxRow: Math.max(a.row, f.row),
    minCol: Math.min(a.col, f.col),
    maxCol: Math.max(a.col, f.col),
  };
}

export function addressAt(rows: NavRow[], rowIdx: number, colIdx: number): CellAddress | null {
  const row = rows[rowIdx];
  if (!row || colIdx < 0 || colIdx >= row.cols.length) return null;
  return { rowKey: row.rowKey, colId: row.cols[colIdx] };
}

export function isInRange(
  rows: NavRow[],
  selection: CellSelection,
  rowKey: string,
  colId: string
): boolean {
  const bounds = getRangeBounds(rows, selection.anchor, selection.focus);
  if (!bounds) return false;
  const pos = findCellIndex(rows, { rowKey, colId });
  if (!pos) return false;
  return (
    pos.row >= bounds.minRow &&
    pos.row <= bounds.maxRow &&
    pos.col >= bounds.minCol &&
    pos.col <= bounds.maxCol
  );
}

export function isRangeCorner(
  rows: NavRow[],
  selection: CellSelection,
  rowKey: string,
  colId: string
): boolean {
  const bounds = getRangeBounds(rows, selection.anchor, selection.focus);
  if (!bounds) return false;
  const corner = addressAt(rows, bounds.maxRow, bounds.maxCol);
  return corner?.rowKey === rowKey && corner?.colId === colId;
}

export function isFillPreview(
  rows: NavRow[],
  selection: CellSelection,
  fillEndRow: number | null,
  rowKey: string,
  colId: string
): boolean {
  if (fillEndRow === null) return false;
  const bounds = getRangeBounds(rows, selection.anchor, selection.focus);
  if (!bounds) return false;
  const pos = findCellIndex(rows, { rowKey, colId });
  if (!pos) return false;
  if (pos.col < bounds.minCol || pos.col > bounds.maxCol) return false;

  if (fillEndRow > bounds.maxRow) {
    return pos.row > bounds.maxRow && pos.row <= fillEndRow;
  }
  if (fillEndRow < bounds.minRow) {
    return pos.row < bounds.minRow && pos.row >= fillEndRow;
  }
  return false;
}

export function serializeRangeToTsv(
  leads: Lead[],
  rows: NavRow[],
  selection: CellSelection
): string {
  const bounds = getRangeBounds(rows, selection.anchor, selection.focus);
  if (!bounds) return "";

  const lines: string[] = [];
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    const cols: string[] = [];
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const addr = addressAt(rows, r, c);
      cols.push(addr ? getCellValue(leads, addr.rowKey, addr.colId) : "");
    }
    lines.push(cols.join("\t"));
  }
  return lines.join("\n");
}

export function pasteTsv(
  leads: Lead[],
  rows: NavRow[],
  start: CellAddress,
  tsv: string,
  writers: GridWriters
): void {
  const startPos = findCellIndex(rows, start);
  if (!startPos) return;

  const lines = tsv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  for (let dr = 0; dr < lines.length; dr++) {
    const values = lines[dr].split("\t");
    for (let dc = 0; dc < values.length; dc++) {
      const addr = addressAt(rows, startPos.row + dr, startPos.col + dc);
      if (!addr) continue;
      setCellValue(leads, addr.rowKey, addr.colId, values[dc], writers);
    }
  }
}

export function applyFill(
  leads: Lead[],
  rows: NavRow[],
  selection: CellSelection,
  fillEndRow: number,
  writers: GridWriters
): void {
  const bounds = getRangeBounds(rows, selection.anchor, selection.focus);
  if (!bounds) return;

  const sourceHeight = bounds.maxRow - bounds.minRow + 1;

  const source: string[][] = [];
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    const rowVals: string[] = [];
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const addr = addressAt(rows, r, c);
      rowVals.push(addr ? getCellValue(leads, addr.rowKey, addr.colId) : "");
    }
    source.push(rowVals);
  }

  const targetStart = fillEndRow > bounds.maxRow ? bounds.maxRow + 1 : fillEndRow;
  const targetEnd = fillEndRow > bounds.maxRow ? fillEndRow : bounds.minRow - 1;
  const step = fillEndRow > bounds.maxRow ? 1 : -1;

  for (let r = targetStart; step > 0 ? r <= targetEnd : r >= targetEnd; r += step) {
    const offset = r - bounds.minRow;
    const srcRowIdx = ((offset % sourceHeight) + sourceHeight) % sourceHeight;
    const pattern = source[srcRowIdx];
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const dc = c - bounds.minCol;
      const addr = addressAt(rows, r, c);
      if (!addr) continue;
      const val = pattern[dc] ?? "";
      setCellValue(leads, addr.rowKey, addr.colId, val, writers);
    }
  }
}
