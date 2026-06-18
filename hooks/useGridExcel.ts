"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, Lead } from "@/lib/types";
import { getCellValue, setCellValue, type GridWriters } from "@/lib/grid-cell-data";
import {
  buildNavRows,
  focusGridCell,
  getExcelRef,
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
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const fillDragging = useRef(false);
  const dragSelecting = useRef(false);
  const clipboardRef = useRef("");
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const writersRef = useRef(writers);
  writersRef.current = writers;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const fillEndRowRef = useRef(fillEndRow);
  fillEndRowRef.current = fillEndRow;
  const editingRef = useRef(editingCell);
  editingRef.current = editingCell;
  const editDraftRef = useRef(editDraft);
  editDraftRef.current = editDraft;

  const focus = selection?.focus ?? null;
  const cellRef = focus ? getExcelRef(navRows, focus) : "";

  const selectCell = useCallback((cell: CellAddress, extend = false) => {
    setEditingCell(null);
    setSelection((prev) => {
      if (extend && prev) return { anchor: prev.anchor, focus: cell };
      return { anchor: cell, focus: cell };
    });
    requestAnimationFrame(() => focusGridCell(gridRef.current, cell, false));
  }, [gridRef]);

  const moveFocus = useCallback(
    (deltaRow: number, deltaCol: number, extend = false) => {
      setEditingCell(null);
      setSelection((prev) => {
        const current = prev?.focus;
        if (!current) {
          const first = navRowsRef.current[0];
          if (!first?.cols[0]) return prev;
          const cell = { rowKey: first.rowKey, colId: first.cols[0] };
          requestAnimationFrame(() => focusGridCell(gridRef.current, cell, false));
          return { anchor: cell, focus: cell };
        }
        const next = moveCell(navRowsRef.current, current, deltaRow, deltaCol);
        if (!next) return prev;
        requestAnimationFrame(() => focusGridCell(gridRef.current, next, false));
        if (extend && prev) return { anchor: prev.anchor, focus: next };
        return { anchor: next, focus: next };
      });
    },
    [gridRef]
  );

  const isEditing = useCallback(
    (cell: CellAddress) =>
      editingCell?.rowKey === cell.rowKey && editingCell?.colId === cell.colId,
    [editingCell]
  );

  const startEdit = useCallback(
    (cell: CellAddress, replaceWith?: string) => {
      const current = getCellValue(leadsRef.current, cell.rowKey, cell.colId);
      setEditingCell(cell);
      setEditDraft(replaceWith !== undefined ? replaceWith : current);
      setSelection({ anchor: cell, focus: cell });
      requestAnimationFrame(() => focusGridCell(gridRef.current, cell, true));
    },
    [gridRef]
  );

  const commitEdit = useCallback(() => {
    const cell = editingRef.current;
    if (!cell) return;
    setCellValue(leadsRef.current, cell.rowKey, cell.colId, editDraftRef.current, writersRef.current);
    setEditingCell(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

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
    dragSelecting.current = false;
    setFillEndRow(null);
    document.body.classList.add("grid-filling");
  }, []);

  const onDragStart = useCallback((cell: CellAddress) => {
    if (fillDragging.current) return;
    dragSelecting.current = true;
  }, []);

  const onDragEnter = useCallback(
    (cell: CellAddress) => {
      if (fillDragging.current || !dragSelecting.current) return;
      selectCell(cell, true);
    },
    [selectCell]
  );

  useEffect(() => {
    function onMouseUp() {
      dragSelecting.current = false;

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
        applyFill(leadsRef.current, rows, sel, endRow, writersRef.current);
      }
    }

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

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [gridRef]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingRef.current) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === "c" && selection) {
        e.preventDefault();
        const text = serializeRangeToTsv(leadsRef.current, navRowsRef.current, selection);
        clipboardRef.current = text;
        navigator.clipboard.writeText(text).catch(() => {});
        return;
      }

      if (isMod && e.key === "v" && focus) {
        e.preventDefault();
        void (async () => {
          let text = clipboardRef.current;
          try {
            text = await navigator.clipboard.readText();
          } catch {
            /* internal clipboard */
          }
          if (!text) return;
          pasteTsv(leadsRef.current, navRowsRef.current, focus, text, writersRef.current);
        })();
        return;
      }

      if (!focus) {
        moveFocus(0, 0);
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        startEdit(focus);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setCellValue(leadsRef.current, focus.rowKey, focus.colId, "", writersRef.current);
        return;
      }

      if (e.key.length === 1 && !isMod && !e.altKey && e.key !== " ") {
        e.preventDefault();
        startEdit(focus, e.key);
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
    [selection, focus, moveFocus, startEdit]
  );

  const bindInputKeys = useCallback(
    (cell: CellAddress) => (e: React.KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === "c" || e.key === "v")) {
        handleGridKeyDown(e);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
        return;
      }

      if (e.shiftKey && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        commitEdit();
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
        commitEdit();
        deltaCol = e.shiftKey ? -1 : 1;
      } else if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
        deltaRow = e.shiftKey ? -1 : 1;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        commitEdit();
        deltaRow = 1;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        commitEdit();
        deltaRow = -1;
      } else if (
        e.key === "ArrowRight" &&
        (isMod || isAtEnd(e.currentTarget))
      ) {
        e.preventDefault();
        commitEdit();
        deltaCol = 1;
      } else if (
        e.key === "ArrowLeft" &&
        (isMod || isAtStart(e.currentTarget))
      ) {
        e.preventDefault();
        commitEdit();
        deltaCol = -1;
      } else {
        return;
      }

      moveFocus(deltaRow, deltaCol, e.shiftKey);
    },
    [handleGridKeyDown, moveFocus, commitEdit, cancelEdit]
  );

  const formulaValue = focus
    ? isEditing(focus)
      ? editDraft
      : getCellValue(leads, focus.rowKey, focus.colId)
    : "";

  const onFormulaChange = useCallback(
    (value: string) => {
      if (!focus) return;
      if (!isEditing(focus)) startEdit(focus);
      setEditDraft(value);
    },
    [focus, isEditing, startEdit]
  );

  const onFormulaCommit = useCallback(() => {
    if (editingRef.current) commitEdit();
    else if (focus) {
      setCellValue(leadsRef.current, focus.rowKey, focus.colId, formulaValue, writersRef.current);
    }
  }, [focus, formulaValue, commitEdit]);

  return {
    navRows,
    focus,
    cellRef,
    formulaValue,
    onFormulaChange,
    onFormulaCommit,
    selectCell,
    cellState,
    isEditing,
    editDraft,
    startEdit,
    commitEdit,
    cancelEdit,
    setEditDraft,
    onFillHandleMouseDown,
    onDragStart,
    onDragEnter,
    handleGridKeyDown,
    bindInputKeys,
  };
}

function rowIndexFromEvent(container: HTMLElement, clientY: number, rows: NavRow[]): number | null {
  const el = document.elementFromPoint(
    container.getBoundingClientRect().left + 80,
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
