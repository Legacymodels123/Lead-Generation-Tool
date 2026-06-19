"use client";

import { useState, useRef, useEffect } from "react";
import { WORKFLOW_PRESETS } from "@/lib/automation/presets";

interface Props {
  onExport: () => void;
  onImport: () => void;
  onAddRow: () => void;
  onRunWorkflow: (presetId: string) => void;
  onScore: () => void;
  onEnrich: () => void;
  onHubSpot: () => void;
  running?: boolean;
  exportDisabled?: boolean;
}

export default function ToolbarActionsMenu({
  onExport,
  onImport,
  onAddRow,
  onRunWorkflow,
  onScore,
  onEnrich,
  onHubSpot,
  running = false,
  exportDisabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="toolbar-actions-menu" ref={ref}>
      <button
        type="button"
        className="toolbar-actions-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        disabled={running}
      >
        Actions
        <span className="toolbar-actions-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="toolbar-actions-dropdown">
          <div className="toolbar-actions-section-label">Workflows</div>
          {WORKFLOW_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onRunWorkflow(p.id);
                setOpen(false);
              }}
            >
              {p.label}
            </button>
          ))}
          <div className="toolbar-actions-divider" />
          <div className="toolbar-actions-section-label">Bulk actions</div>
          <button type="button" onClick={() => { onScore(); setOpen(false); }}>
            Recalculate fit score
          </button>
          <button type="button" onClick={() => { onEnrich(); setOpen(false); }}>
            Enrich emails
          </button>
          <button type="button" onClick={() => { onHubSpot(); setOpen(false); }}>
            Sync to HubSpot
          </button>
          <div className="toolbar-actions-divider" />
          <button type="button" disabled={exportDisabled} onClick={() => { onExport(); setOpen(false); }}>
            Export CSV
          </button>
          <button type="button" onClick={() => { onImport(); setOpen(false); }}>
            Import CSV
          </button>
          <button type="button" onClick={() => { onAddRow(); setOpen(false); }}>
            + Add row
          </button>
        </div>
      )}
    </div>
  );
}
