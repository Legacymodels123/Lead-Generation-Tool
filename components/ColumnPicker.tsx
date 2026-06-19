"use client";

import { useState } from "react";
import { GRID_COLUMNS } from "@/lib/grid-columns";
import { customColumnGridId, mergeGridColumns } from "@/lib/merge-grid-columns";
import type { CustomColumn } from "@/lib/types";

interface Props {
  visibleColumns: string[];
  customColumns?: CustomColumn[];
  onChange: (columns: string[]) => void;
}

export default function ColumnPicker({
  visibleColumns,
  customColumns = [],
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const allColumns = mergeGridColumns(customColumns);
  const order = allColumns.map((c) => c.id);

  function toggle(id: string) {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length <= 3) return;
      onChange(visibleColumns.filter((c) => c !== id));
    } else {
      onChange([...visibleColumns, id].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    }
  }

  function move(id: string, dir: -1 | 1) {
    const idx = visibleColumns.indexOf(id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= visibleColumns.length) return;
    const copy = [...visibleColumns];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  }

  return (
    <div className="column-picker">
      <button type="button" className="smooth-toolbar-btn" onClick={() => setOpen(!open)}>
        Columns {visibleColumns.length}/{allColumns.length}
      </button>
      {open && (
        <div className="column-picker-popover">
          <div className="column-picker-title">Zichtbare kolommen</div>
          {allColumns.map((col) => {
            const visible = visibleColumns.includes(col.id);
            const idx = visibleColumns.indexOf(col.id);
            const isCustom = col.id.startsWith("custom:");
            return (
              <div key={col.id} className="column-picker-row">
                <label>
                  <input type="checkbox" checked={visible} onChange={() => toggle(col.id)} />
                  {col.label}
                  {isCustom && <span className="column-picker-custom"> custom</span>}
                </label>
                {visible && (
                  <span className="column-picker-move">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => move(col.id, -1)}
                      aria-label="Omhoog"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === visibleColumns.length - 1}
                      onClick={() => move(col.id, 1)}
                      aria-label="Omlaag"
                    >
                      ↓
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
