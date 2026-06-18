"use client";

import { useState } from "react";
import type { LeadView } from "@/lib/views";
import { createView } from "@/lib/views";

interface Props {
  views: LeadView[];
  activeViewId: string;
  onSelect: (id: string) => void;
  onSaveCurrent: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function ViewSelector({
  views,
  activeViewId,
  onSelect,
  onSaveCurrent,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");

  const active = views.find((v) => v.id === activeViewId) ?? views[0];

  function handleSave() {
    const name = newName.trim();
    if (!name) return;
    onSaveCurrent(name);
    setNewName("");
    setShowSave(false);
    setOpen(false);
  }

  return (
    <div className="view-selector">
      <button
        type="button"
        className="view-selector-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="view-selector-label">View</span>
        <span className="view-selector-name">{active?.name ?? "Alle leads"}</span>
        <span className="view-selector-chevron">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="view-dropdown">
          {views.map((v) => (
            <div key={v.id} className="view-dropdown-item">
              <button
                type="button"
                className={`view-option${v.id === activeViewId ? " active" : ""}`}
                onClick={() => {
                  onSelect(v.id);
                  setOpen(false);
                }}
              >
                {v.name}
              </button>
              {!["alle", "nieuw", "hoge-fit"].includes(v.id) && (
                <button
                  type="button"
                  className="view-delete"
                  onClick={() => onDelete(v.id)}
                  title="Verwijder view"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="view-dropdown-divider" />
          {!showSave ? (
            <button
              type="button"
              className="view-option view-add"
              onClick={() => setShowSave(true)}
            >
              + Nieuwe view
            </button>
          ) : (
            <div className="view-save-form">
              <input
                type="text"
                placeholder="Naam van view"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <button type="button" className="btn-primary btn-sm" onClick={handleSave}>
                Opslaan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { createView };
