"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import ColumnBuilder from "@/components/ColumnBuilder";
import type { CustomColumn, CustomColumnType } from "@/lib/types";

export default function ColumnsPage() {
  const { workspaceId, showToast } = useApp();
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    fetchColumns();
  }, [workspaceId]);

  const fetchColumns = async () => {
    try {
      const res = await fetch(`/api/columns?workspaceId=${workspaceId}`);
      const data = await res.json();
      setCustomColumns(data.custom || []);
    } catch (error) {
      console.error("Error fetching columns:", error);
      showToast("✗ Fout bij laden kolommen");
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async (column: {
    label: string;
    type: CustomColumnType;
    selectOptions?: string[];
    defaultValue?: string;
  }) => {
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          ...column,
        }),
      });

      if (!res.ok) throw new Error("Failed to create column");

      const newColumn = await res.json();
      setCustomColumns([...customColumns, newColumn]);
      showToast(`✓ Kolom "${column.label}" aangemaakt`);
    } catch (error) {
      console.error("Error creating column:", error);
      showToast("✗ Fout bij aanmaken kolom");
    }
  };

  const handleDeleteColumn = async (columnId: string, label: string) => {
    if (!confirm(`Weet je zeker dat je "${label}" wilt verwijderen?`)) return;

    try {
      const res = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });

      if (!res.ok) throw new Error("Failed to delete column");

      setCustomColumns(customColumns.filter((c) => c.id !== columnId));
      showToast(`✓ Kolom verwijderd`);
    } catch (error) {
      console.error("Error deleting column:", error);
      showToast("✗ Fout bij verwijderen kolom");
    }
  };

  const handleToggleVisibility = async (columnId: string, visible: boolean) => {
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !visible }),
      });

      if (!res.ok) throw new Error("Failed to update column");

      const updated = await res.json();
      setCustomColumns(customColumns.map((c) => (c.id === columnId ? updated : c)));
      showToast(`✓ Zichtbaarheid gewijzigd`);
    } catch (error) {
      console.error("Error updating column:", error);
      showToast("✗ Fout bij wijzigen zichtbaarheid");
    }
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Kolommen beheren</span>
        <span className="topbar-sub">— Voeg aangepaste velden toe aan je leads</span>
      </div>

      <div className="content" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>Kolommen</h1>
            <p style={{ fontSize: "13px", color: "#666" }}>
              Je hebt {customColumns.length} aangepaste kolom{customColumns.length !== 1 ? "men" : ""} gemaakt
            </p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            style={{
              padding: "10px 16px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Kolom toevoegen
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
            Laden...
          </div>
        ) : customColumns.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
              Nog geen aangepaste kolommen. Voeg je eerste kolom toe!
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              style={{
                padding: "8px 16px",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Kolom toevoegen
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {customColumns.map((column) => (
              <div
                key={column.id}
                style={{
                  padding: "16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{column.label}</div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Type: <span style={{ fontFamily: "monospace" }}>{column.type}</span>
                    {column.defaultValue && (
                      <>
                        {" "}
                        • Standaard:{" "}
                        <span style={{ fontFamily: "monospace" }}>{column.defaultValue}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={() => handleToggleVisibility(column.id, column.visible)}
                    style={{
                      padding: "6px 12px",
                      background: column.visible ? "#dcfce7" : "#f3f4f6",
                      color: column.visible ? "#166534" : "#666",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {column.visible ? "✓ Zichtbaar" : "Verborgen"}
                  </button>

                  <button
                    onClick={() => handleDeleteColumn(column.id, column.label)}
                    style={{
                      padding: "6px 12px",
                      background: "#fecaca",
                      color: "#991b1b",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBuilder && (
        <ColumnBuilder onAdd={handleAddColumn} onClose={() => setShowBuilder(false)} />
      )}
    </>
  );
}
