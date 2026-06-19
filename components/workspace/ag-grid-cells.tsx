"use client";

import type { ICellRendererParams } from "ag-grid-community";
import type { Confidence, LeadFit, LeadStatus, WorkspaceLead } from "@/lib/workspace/types";
import { isDraftWorkspaceLead } from "@/lib/workspace/draft-row";

const STATUS_STYLES: Record<LeadStatus, string> = {
  New: "ws-pill-status-new",
  Researching: "ws-pill-status-researching",
  "Needs Validation": "ws-pill-status-validation",
  Qualified: "ws-pill-status-qualified",
  Contacted: "ws-pill-status-contacted",
  Rejected: "ws-pill-status-rejected",
};

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  Low: "ws-pill-conf-low",
  Medium: "ws-pill-conf-medium",
  High: "ws-pill-conf-high",
};

const FIT_STYLES: Record<LeadFit, string> = {
  Weak: "ws-pill-fit-weak",
  Medium: "ws-pill-fit-medium",
  Strong: "ws-pill-fit-strong",
};

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`ws-field-pill ${className}`}>{label}</span>;
}

export function StatusCellRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const value = params.value as LeadStatus | undefined;
  if (!value) return <span className="ws-cell-empty">—</span>;
  return <Pill label={value} className={STATUS_STYLES[value] ?? ""} />;
}

export function ConfidenceCellRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const value = params.value as Confidence | undefined;
  if (!value) return <span className="ws-cell-empty">—</span>;
  return <Pill label={value} className={CONFIDENCE_STYLES[value] ?? ""} />;
}

export function LeadFitCellRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const value = params.value as LeadFit | undefined;
  if (!value) return <span className="ws-cell-empty">—</span>;
  return <Pill label={value} className={FIT_STYLES[value] ?? ""} />;
}

export function TextCellRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const value = params.value as string | undefined;
  if (!value?.trim()) {
    if (isDraftWorkspaceLead(params.data)) {
      return <span className="ws-cell-placeholder">Click to add…</span>;
    }
    return <span className="ws-cell-empty">Click to edit</span>;
  }
  if (params.colDef?.field === "evidence_url" || params.colDef?.field === "domain") {
    return <span className="ws-cell-link">{value}</span>;
  }
  return <span className="ws-cell-text">{value}</span>;
}

export function ValidationCellRenderer(params: ICellRendererParams<WorkspaceLead>) {
  const errors = params.data?.validation_errors ?? [];
  if (!errors.length) {
    return <span className="ws-valid-ok">Valid</span>;
  }
  return (
    <span className="ws-valid-errors" title={errors.join("\n")}>
      {errors.length} issue{errors.length > 1 ? "s" : ""}
    </span>
  );
}
