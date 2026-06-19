"use client";

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { CellAddress } from "@/lib/grid-navigation";

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  cell: CellAddress;
  value: string;
  editSeed?: string;
  displayValue?: string;
  type?: "text" | "select";
  options?: SelectOption[];
  prefix?: ReactNode;
  active: boolean;
  inRange?: boolean;
  fillPreview?: boolean;
  showFillHandle?: boolean;
  isEditing: boolean;
  onSelect: (cell: CellAddress, extend: boolean) => void;
  onStartEdit: (cell: CellAddress) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onInputKeyDown: (cell: CellAddress) => (e: KeyboardEvent) => void;
  onFillHandleMouseDown?: (e: MouseEvent) => void;
  onDragEnter: (cell: CellAddress) => void;
  onDragStart: (cell: CellAddress) => void;
  className?: string;
}

export default function ExcelCell({
  cell,
  value,
  editSeed,
  displayValue,
  type = "text",
  options,
  prefix,
  active,
  inRange = false,
  fillPreview = false,
  showFillHandle = false,
  isEditing,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  onInputKeyDown,
  onFillHandleMouseDown,
  onDragEnter,
  onDragStart,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const { rowKey, colId } = cell;

  useEffect(() => {
    if (!isEditing || !inputRef.current) return;
    inputRef.current.focus();
    if (inputRef.current instanceof HTMLInputElement) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const shown = displayValue ?? value;

  const commitFromInput = () => {
    if (!inputRef.current) return;
    onCommit(inputRef.current.value);
  };

  return (
    <td
      data-row-key={rowKey}
      data-col-id={colId}
      className={[
        "grid-cell",
        "grid-cell-editable",
        "excel-cell",
        active ? "grid-cell-active" : "",
        inRange && !active ? "grid-cell-in-range" : "",
        fillPreview ? "grid-cell-fill-preview" : "",
        isEditing ? "grid-cell-editing" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        e.stopPropagation();
        onDragStart(cell);
        onSelect(cell, e.shiftKey);
      }}
      onClick={(e) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        e.stopPropagation();
        if (!isEditing) onStartEdit(cell);
      }}
      onMouseEnter={() => onDragEnter(cell)}
    >
      {isEditing ? (
        type === "select" ? (
          <select
            key={`${rowKey}-${colId}-edit`}
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="excel-cell-editor excel-cell-select"
            defaultValue={editSeed ?? value}
            onChange={(e) => onCommit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
              onInputKeyDown(cell)(e);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            key={`${rowKey}-${colId}-edit`}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="excel-cell-editor"
            defaultValue={editSeed ?? value}
            onKeyDown={onInputKeyDown(cell)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitFromInput}
          />
        )
      ) : (
        <div className="excel-cell-display">
          {prefix}
          <span className="excel-cell-text" title={shown}>
            {shown ||
              (className.includes("excel-cell-placeholder") ? "Click to add…" : "\u00a0")}
          </span>
        </div>
      )}
      {showFillHandle && onFillHandleMouseDown && !isEditing && (
        <span
          className="grid-fill-handle"
          onMouseDown={onFillHandleMouseDown}
          title="Drag to fill"
        />
      )}
    </td>
  );
}
