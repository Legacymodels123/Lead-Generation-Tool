"use client";

import { useState } from "react";
import type { CustomColumnType, ColumnAutomation, ColumnAutomationKind } from "@/lib/types";

const COLUMN_TYPES: { value: CustomColumnType; label: string; description: string }[] = [
  { value: "text", label: "Tekst", description: "Korte of lange tekst" },
  { value: "number", label: "Getal", description: "Numerieke waarden" },
  { value: "date", label: "Datum", description: "Datumvelden" },
  { value: "email", label: "E-mail", description: "E-mailadressen" },
  { value: "url", label: "URL", description: "Website links" },
  { value: "select", label: "Dropdown", description: "Opties kiezen" },
];

const AUTOMATION_TYPES: { value: ColumnAutomationKind | "none"; label: string }[] = [
  { value: "none", label: "Geen automatisering" },
  { value: "ai", label: "AI kolom" },
  { value: "enrich", label: "E-mail verrijken" },
  { value: "research", label: "Website research" },
  { value: "score", label: "ICP score" },
  { value: "hubspot", label: "Sync naar HubSpot" },
];

interface ColumnBuilderProps {
  onAdd: (column: {
    label: string;
    type: CustomColumnType;
    selectOptions?: string[];
    defaultValue?: string;
    automation?: ColumnAutomation;
  }) => void;
  onClose: () => void;
}

export default function ColumnBuilder({ onAdd, onClose }: ColumnBuilderProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomColumnType>("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [error, setError] = useState("");
  const [automationKind, setAutomationKind] = useState<ColumnAutomationKind | "none">("none");
  const [aiPrompt, setAiPrompt] = useState("Write a one-line sales insight for this company.");

  const handleAddOption = () => {
    if (newOption.trim() && !selectOptions.includes(newOption)) {
      setSelectOptions([...selectOptions, newOption]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setSelectOptions(selectOptions.filter((o) => o !== option));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!label.trim()) {
      setError("Kolom naam is verplicht");
      return;
    }

    if (type === "select" && selectOptions.length === 0) {
      setError("Voeg minimaal een optie toe voor dropdown kolom");
      return;
    }

    const automation: ColumnAutomation | undefined =
      automationKind === "none"
        ? undefined
        : automationKind === "ai"
          ? { kind: "ai", prompt: aiPrompt }
          : automationKind === "enrich"
            ? { kind: "enrich", field: "email" }
            : automationKind === "research"
              ? { kind: "research", source: "website" }
              : automationKind === "score"
                ? { kind: "score" }
                : { kind: "hubspot" };

    onAdd({
      label: label.trim(),
      type,
      defaultValue: defaultValue || undefined,
      selectOptions: type === "select" ? selectOptions : undefined,
      automation,
    });

    setLabel("");
    setType("text");
    setDefaultValue("");
    setSelectOptions([]);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "32px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Nieuwe kolom toevoegen</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
              Kolom naam *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="bijv. Sector, Budget, Omzet"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "12px" }}>
              Gegevenstype *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {COLUMN_TYPES.map((colType) => (
                <label
                  key={colType.value}
                  style={{
                    padding: "12px",
                    border: `2px solid ${type === colType.value ? "#000" : "#e5e7eb"}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    value={colType.value}
                    checked={type === colType.value}
                    onChange={(e) => setType(e.target.value as CustomColumnType)}
                    style={{ marginRight: "6px" }}
                  />
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{colType.label}</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>{colType.description}</div>
                </label>
              ))}
            </div>
          </div>

          {type === "select" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "8px" }}>
                Opties *
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Optie invoeren"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  style={{
                    padding: "8px 12px",
                    background: "#f0f0f0",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>

              {selectOptions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectOptions.map((option) => (
                    <div
                      key={option}
                      style={{
                        padding: "4px 12px",
                        background: "#f0f0f0",
                        borderRadius: "4px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#999",
                          fontSize: "14px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "12px" }}>
              Automatisering
            </label>
            <select
              value={automationKind}
              onChange={(e) => setAutomationKind(e.target.value as ColumnAutomationKind | "none")}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              {AUTOMATION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {automationKind === "ai" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                AI prompt
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
              Standaardwaarde (optioneel)
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Standaardwaarde voor nieuwe leads"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{ padding: "12px", background: "#fecaca", color: "#991b1b", borderRadius: "6px", fontSize: "13px", marginBottom: "20px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "#f0f0f0",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Annuleren
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
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
              Kolom toevoegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
