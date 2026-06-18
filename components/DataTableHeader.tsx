"use client";

import { useRef, useEffect } from "react";

interface DataTableHeaderProps {
  title: string;
  count: number;
  selectedCount: number;
  onSelectAll: (selected: boolean) => void;
  actions: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: "primary" | "secondary" | "danger";
  }>;
}

export default function DataTableHeader({
  title,
  count,
  selectedCount,
  onSelectAll,
  actions,
}: DataTableHeaderProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = selectedCount > 0 && selectedCount < count;
    }
  }, [selectedCount, count]);

  return (
    <div
      style={{
        padding: "16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={selectedCount === count && count > 0}
          onChange={(e) => onSelectAll(e.target.checked)}
          style={{ cursor: "pointer" }}
          title={`${selectedCount > 0 ? "Deselecteer" : "Selecteer"} alle`}
        />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>
            {title}
            {hasSelection && (
              <span style={{ color: "#666", fontWeight: 400 }}>
                {" "}
                ({selectedCount} geselecteerd)
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "#999" }}>
            {count} {count === 1 ? "item" : "items"}
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              style={{
                padding: "6px 12px",
                background:
                  action.variant === "danger"
                    ? "#ef4444"
                    : action.variant === "secondary"
                      ? "#f0f0f0"
                      : "#000",
                color:
                  action.variant === "secondary"
                    ? "#000"
                    : "#fff",
                border:
                  action.variant === "secondary"
                    ? "1px solid #e5e7eb"
                    : "none",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: action.disabled ? "not-allowed" : "pointer",
                opacity: action.disabled ? 0.5 : 1,
              }}
            >
              {action.loading ? `${action.label}…` : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
