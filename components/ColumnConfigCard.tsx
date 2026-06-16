"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import {
  fetchWorkspaceConfig,
  updateWorkspaceConfig,
  clearConfigCache,
} from "@/lib/workspace/config";
import { DEFAULT_COLUMNS } from "@/lib/types";
import type { ColumnConfig, WorkspaceConfig } from "@/lib/types";

export default function ColumnConfigCard() {
  const { workspaceId } = useApp();
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  useEffect(() => {
    loadColumns();
  }, [workspaceId]);

  async function loadColumns() {
    const cfg = await fetchWorkspaceConfig(workspaceId);
    if (cfg.columns && cfg.columns.length > 0) {
      setColumns(cfg.columns);
    } else {
      setColumns(DEFAULT_COLUMNS);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      await updateWorkspaceConfig(workspaceId, { columns });
      clearConfigCache(workspaceId);
      setMessage("✓ Kolommen opgeslagen");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(
        "✗ Fout bij opslaan: " + (err instanceof Error ? err.message : "Unknown")
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleColumn(index: number) {
    const updated = [...columns];
    updated[index].visible = !updated[index].visible;
    setColumns(updated);
  }

  function resetToDefaults() {
    setColumns([...DEFAULT_COLUMNS]);
    setMessage("Teruggezet naar standaardkolommen");
    setTimeout(() => setMessage(""), 3000);
  }

  function handleDragStart(index: number) {
    setDraggedItem(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(index: number) {
    if (draggedItem === null || draggedItem === index) {
      setDraggedItem(null);
      return;
    }

    const updated = [...columns];
    const [draggedColumn] = updated.splice(draggedItem, 1);
    updated.splice(index, 0, draggedColumn);

    // Update order property
    updated.forEach((col, i) => {
      col.order = i;
    });

    setColumns(updated);
    setDraggedItem(null);
  }

  return (
    <div className="card">
      <div className="card-title">Leadkolommen</div>
      <div className="card-desc">
        Sleep om volgorde te wijzigen. Vink uit om kolommen te verbergen.
      </div>

      <div style={{ marginTop: 16, marginBottom: 20 }}>
        {columns.map((col, idx) => (
          <div
            key={col.key}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              marginBottom: 4,
              background: draggedItem === idx ? "#f0f0f0" : "#fafafa",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "grab",
            }}
          >
            <span style={{ color: "#999", userSelect: "none" }}>⋮</span>
            <input
              type="checkbox"
              checked={col.visible}
              disabled={col.readonly}
              onChange={() => toggleColumn(idx)}
              style={{ cursor: col.readonly ? "not-allowed" : "pointer" }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: col.visible ? 500 : 400,
                opacity: col.visible ? 1 : 0.6,
              }}
            >
              {col.label}
              {col.readonly && <span style={{ fontSize: 11, color: "#999" }}> (verplicht)</span>}
            </span>
            <span style={{ color: "#999", fontSize: 12 }}>
              {col.visible ? "✓ Zichtbaar" : "✗ Verborgen"}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={resetToDefaults}
          style={{ flex: 1 }}
        >
          Reset
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: 12,
            color: message.includes("✓") ? "#16a34a" : "#dc2626",
            fontSize: 13,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
