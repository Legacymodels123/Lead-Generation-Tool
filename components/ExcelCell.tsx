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
  onDraftChange: (value: string) => void;
  onCommit: () => void;
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
  onDraftChange,
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
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const shown = displayValue ?? value;

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
        e.stopPropagation();
        onDragStart(cell);
        onSelect(cell, e.shiftKey);
      }}
      onMouseEnter={() => onDragEnter(cell)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(cell);
      }}
    >
      {isEditing ? (
        type === "select" ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="excel-cell-editor excel-cell-select"
            value={value}
            onChange={(e) => {
              onDraftChange(e.target.value);
              onCommit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
              onInputKeyDown(cell)(e);
            }}
            onBlur={onCommit}
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="excel-cell-editor"
            value={value}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onInputKeyDown(cell)}
            onBlur={onCommit}
          />
        )
      ) : (
        <div className="excel-cell-display">
          {prefix}
          <span className="excel-cell-text" title={shown}>
            {shown || "\u00a0"}
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
