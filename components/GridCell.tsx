"use client";

import type { MouseEvent, ReactNode } from "react";
import type { CellAddress } from "@/lib/grid-navigation";

interface Props {
  rowKey: string;
  colId: string;
  active: boolean;
  inRange?: boolean;
  fillPreview?: boolean;
  showFillHandle?: boolean;
  editable?: boolean;
  className?: string;
  onActivate: (cell: CellAddress, extend: boolean) => void;
  onFillHandleMouseDown?: (e: MouseEvent) => void;
  children: ReactNode;
}

export default function GridCell({
  rowKey,
  colId,
  active,
  inRange = false,
  fillPreview = false,
  showFillHandle = false,
  editable = true,
  className = "",
  onActivate,
  onFillHandleMouseDown,
  children,
}: Props) {
  return (
    <td
      tabIndex={editable ? -1 : undefined}
      data-row-key={rowKey}
      data-col-id={colId}
      className={[
        "grid-cell",
        editable ? "grid-cell-editable" : "",
        active ? "grid-cell-active" : "",
        inRange && !active ? "grid-cell-in-range" : "",
        fillPreview ? "grid-cell-fill-preview" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        if (editable) {
          e.stopPropagation();
          onActivate({ rowKey, colId }, e.shiftKey);
          const input = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
            "input, select, textarea"
          );
          input?.focus();
        }
      }}
    >
      {children}
      {showFillHandle && onFillHandleMouseDown && (
        <span
          className="grid-fill-handle"
          onMouseDown={onFillHandleMouseDown}
          title="Drag to fill"
        />
      )}
    </td>
  );
}
