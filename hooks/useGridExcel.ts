"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, Lead } from "@/lib/types";
import type { GridWriters } from "@/lib/grid-cell-data";
import {
  buildNavRows,
  focusGridCell,
  moveCell,
  type CellAddress,
  type NavRow,
} from "@/lib/grid-navigation";
import {
  applyFill,
  getRangeBounds,
  isFillPreview,
  isInRange,
  isRangeCorner,
  pasteTsv,
  serializeRangeToTsv,
  type CellSelection,
} from "@/lib/grid-selection";

interface Options {
  leads: Lead[];
  visibleColumns: string[];
  writers: GridWriters;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export function useGridExcel({ leads, visibleColumns, writers, gridRef }: Options) {
  const navRows = buildNavRows(leads, visibleColumns);
  const navRowsRef = useRef(navRows);
  navRowsRef.current = navRows;

  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [fillEndRow, setFillEndRow] = useState<number | null>(null);
  const fillDragging = useRef(false);
  const clipboardRef = useRef<string>("");

  const focus = selection?.focus ?? null;

  const selectCell = useCallback((cell: CellAddress, extend = false) => {
    setSelection((prev) => {
      if (extend && prev) return { anchor: prev.anchor, focus: cell };
      return { anchor: cell, focus: cell };
    });
  }, []);

  const moveFocus = useCallback(
    (deltaRow: number, deltaCol: number, extend = false) => {
      setSelection((prev) => {
        const current = prev?.focus;
        if (!current) {
          const first = navRowsRef.current[0];
          if (!first?.cols[0]) return prev;
          const cell = { rowKey: first.rowKey, colId: first.cols[0] };
          return { anchor: cell, focus: cell };
        }
        const next = moveCell(navRowsRef.current, current, deltaRow, deltaCol);
        if (!next) return prev;
        requestAnimationFrame(() => focusGridCell(gridRef.current, next));
        if (extend && prev) return { anchor: prev.anchor, focus: next };
        return { anchor: next, focus: next };
      });
    },
    [gridRef]
  );

  const cellState = useCallback(
    (rowKey: string, colId: string) => {
      const sel = selection;
      return {
        active: focus?.rowKey === rowKey && focus?.colId === colId,
        inRange: sel ? isInRange(navRows, sel, rowKey, colId) : false,
        fillPreview: sel ? isFillPreview(navRows, sel, fillEndRow, rowKey, colId) : false,
        showFillHandle: sel ? isRangeCorner(navRows, sel, rowKey, colId) : false,
      };
    },
    [selection, focus, navRows, fillEndRow]
  );

  const onFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fillDragging.current = true;
    setFillEndRow(null);
    document.body.classList.add("grid-filling");
  }, []);

  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const fillEndRowRef = useRef(fillEndRow);
  fillEndRowRef.current = fillEndRow;
  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!fillDragging.current || !selectionRef.current) return;
      const container = gridRef.current;
      if (!container) return;
      const rows = navRowsRef.current;
      const sel = selectionRef.current;
      const b = getRangeBounds(rows, sel.anchor, sel.focus);
      if (!b) return;

      const rowIdx = rowIndexFromEvent(container, e.clientY, rows);
      if (rowIdx === null) return;
      if (rowIdx > b.maxRow) setFillEndRow(rowIdx);
      else if (rowIdx < b.minRow) setFillEndRow(rowIdx);
      else setFillEndRow(b.maxRow);
    }

    function onMouseUp() {
      if (!fillDragging.current) return;
      document.body.classList.remove("grid-filling");
      const sel = selectionRef.current;
      const endRow = fillEndRowRef.current;
      fillDragging.current = false;
      setFillEndRow(null);

      if (!sel || endRow === null) return;
      const rows = navRowsRef.current;
      const b = getRangeBounds(rows, sel.anchor, sel.focus);
      if (!b || endRow === b.maxRow) return;
      if (endRow > b.maxRow || endRow < b.minRow) {
        applyFill(leadsRef.current, rows, sel, endRow, writers);
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [gridRef, writers]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === "c" && selection) {
        e.preventDefault();
        const text = serializeRangeToTsv(leads, navRowsRef.current, selection);
        clipboardRef.current = text;
        navigator.clipboard.writeText(text).catch(() => {});
        return;
      }

      if (isMod && e.key === "v" && focus) {
        e.preventDefault();
        const paste = async () => {
          let text = clipboardRef.current;
          try {
            text = await navigator.clipboard.readText();
          } catch {
            /* use internal clipboard */
          }
          if (!text) return;
          pasteTsv(leads, navRowsRef.current, focus, text, writers);
        };
        void paste();
        return;
      }

      if (!focus) {
        moveFocus(0, 0);
        return;
      }

      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(e.key)) return;
      e.preventDefault();
      const delta =
        e.key === "ArrowUp"
          ? { r: -1, c: 0 }
          : e.key === "ArrowDown"
            ? { r: 1, c: 0 }
            : e.key === "ArrowLeft"
              ? { r: 0, c: -1 }
              : { r: 0, c: 1 };
      moveFocus(delta.r, delta.c, e.shiftKey);
    },
    [selection, focus, leads, writers, moveFocus]
  );

  const bindInputKeys = useCallback(
    (cell: CellAddress) => (e: React.KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === "c" || e.key === "v")) {
        handleGridKeyDown(e);
        return;
      }

      if (e.shiftKey && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const delta =
          e.key === "ArrowUp"
            ? { r: -1, c: 0 }
            : e.key === "ArrowDown"
              ? { r: 1, c: 0 }
              : e.key === "ArrowLeft"
                ? { r: 0, c: -1 }
                : { r: 0, c: 1 };
        moveFocus(delta.r, delta.c, true);
        return;
      }

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
      } else if (
        e.key === "ArrowRight" &&
        (e.ctrlKey || e.metaKey || isAtEnd(e.currentTarget))
      ) {
        e.preventDefault();
        deltaCol = 1;
      } else if (
        e.key === "ArrowLeft" &&
        (e.ctrlKey || e.metaKey || isAtStart(e.currentTarget))
      ) {
        e.preventDefault();
        deltaCol = -1;
      } else {
        return;
      }

      moveFocus(deltaRow, deltaCol, e.shiftKey);
    },
    [handleGridKeyDown, moveFocus]
  );

  const onCellFocus = useCallback(
    (cell: CellAddress) => {
      selectCell(cell, false);
    },
    [selectCell]
  );

  return {
    navRows,
    focus,
    selectCell,
    cellState,
    onFillHandleMouseDown,
    handleGridKeyDown,
    bindInputKeys,
    onCellFocus,
  };
}

function rowIndexFromEvent(container: HTMLElement, clientY: number, rows: NavRow[]): number | null {
  const el = document.elementFromPoint(
    container.getBoundingClientRect().left + 48,
    clientY
  ) as HTMLElement | null;
  const td = el?.closest("td[data-row-key][data-col-id]") as HTMLElement | null;
  if (!td) return null;
  const rowKey = td.getAttribute("data-row-key");
  if (!rowKey) return null;
  const idx = rows.findIndex((r) => r.rowKey === rowKey);
  return idx >= 0 ? idx : null;
}

function isAtEnd(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return true;
  return el.selectionStart === el.value.length;
}

function isAtStart(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return true;
  return el.selectionStart === 0;
}
