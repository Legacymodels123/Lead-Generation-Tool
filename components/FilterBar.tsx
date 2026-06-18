"use client";

import type { LeadStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: LeadStatus | "alle";
  onStatusChange: (value: LeadStatus | "alle") => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: FilterBarProps) {
  const statuses: Array<{ value: LeadStatus | "alle"; label: string }> = [
    { value: "alle", label: "Alle Statussen" },
    { value: "qualified", label: STATUS_LABELS.qualified },
    { value: "not_qualified", label: STATUS_LABELS.not_qualified },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            background: "#fff",
          }}
        >
          <span style={{ color: "#999", marginRight: "8px" }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Zoek bedrijf, contact, markt..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "13px",
              fontFamily: "inherit",
              background: "transparent",
            }}
          />
        </div>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as LeadStatus | "alle")}
        style={{
          padding: "8px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          fontSize: "13px",
          fontFamily: "inherit",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
