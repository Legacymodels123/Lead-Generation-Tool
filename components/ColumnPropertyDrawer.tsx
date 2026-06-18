"use client";

import { useEffect, useState } from "react";
import type { ColumnCondition, ColumnConditionOperator, CustomColumn, CustomColumnType } from "@/lib/types";
import { DRAWER_COLUMN_TYPES } from "@/lib/utils/custom-columns";

const TYPE_LABELS: Record<CustomColumnType, string> = {
  text: "Single line text",
  select: "Dropdown",
  ai_enriched: "AI enriched",
  number: "Number",
  date: "Date",
  email: "Email",
  url: "URL",
};

const OPERATORS: { value: ColumnConditionOperator; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

const CONDITION_FIELDS = [
  { value: "status", label: "Status" },
  { value: "market", label: "Market" },
  { value: "company", label: "Company" },
];

interface Props {
  open: boolean;
  column: CustomColumn | null;
  mode: "create" | "edit";
  initialType?: CustomColumnType;
  onClose: () => void;
  onSave: (data: {
    label: string;
    type: CustomColumnType;
    defaultValue?: string;
    selectOptions?: string[];
    aiPrompt?: string;
    condition?: ColumnCondition;
  }) => Promise<void>;
  onRunAi?: () => Promise<void>;
}

export default function ColumnPropertyDrawer({
  open,
  column,
  mode,
  initialType = "text",
  onClose,
  onSave,
  onRunAi,
}: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomColumnType>(initialType);
  const [defaultValue, setDefaultValue] = useState("");
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [conditionEnabled, setConditionEnabled] = useState(false);
  const [conditionField, setConditionField] = useState("status");
  const [conditionOperator, setConditionOperator] =
    useState<ColumnConditionOperator>("eq");
  const [conditionValue, setConditionValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (column && mode === "edit") {
      setLabel(column.label);
      setType(column.type);
      setDefaultValue(String(column.defaultValue ?? ""));
      setSelectOptions(column.selectOptions ?? []);
      setAiPrompt(column.aiPrompt ?? "");
      if (column.condition) {
        setConditionEnabled(true);
        setConditionField(column.condition.field);
        setConditionOperator(column.condition.operator);
        setConditionValue(column.condition.value ?? "");
      } else {
        setConditionEnabled(false);
      }
    } else {
      setLabel("");
      setType(initialType);
      setDefaultValue("");
      setSelectOptions([]);
      setAiPrompt("");
      setConditionEnabled(false);
      setConditionField("status");
      setConditionOperator("eq");
      setConditionValue("");
    }
    setError("");
  }, [open, column, mode, initialType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Property name is required");
      return;
    }
    if (type === "select" && selectOptions.length === 0) {
      setError("Add at least one dropdown option");
      return;
    }
    if (type === "ai_enriched" && !aiPrompt.trim()) {
      setError("AI prompt is required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        type,
        defaultValue: defaultValue || undefined,
        selectOptions: type === "select" ? selectOptions : undefined,
        aiPrompt: type === "ai_enriched" ? aiPrompt.trim() : undefined,
        condition: conditionEnabled
          ? {
              field: conditionField,
              operator: conditionOperator,
              value:
                conditionOperator === "empty" || conditionOperator === "not_empty"
                  ? undefined
                  : conditionValue,
            }
          : undefined,
      });
      onClose();
    } catch {
      setError("Failed to save property");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <aside className={`column-property-drawer${open ? " open" : ""}`}>
      <div className="column-property-head">
        <h3>{mode === "create" ? "Add property" : "Column property"}</h3>
        <button type="button" className="column-property-close" onClick={onClose}>
          ×
        </button>
      </div>

      <form className="column-property-body" onSubmit={handleSubmit}>
        {mode === "create" && (
          <label className="column-property-field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as CustomColumnType)}>
              {DRAWER_COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === "edit" && (
          <div className="column-property-type-badge">{TYPE_LABELS[type] ?? type}</div>
        )}

        <label className="column-property-field">
          <span>Name</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Property name" />
        </label>

        {type === "text" && (
          <label className="column-property-field">
            <span>Default value</span>
            <input
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Optional"
            />
          </label>
        )}

        {type === "select" && (
          <div className="column-property-field">
            <span>Options</span>
            <div className="column-property-options">
              {selectOptions.map((opt) => (
                <span key={opt} className="column-property-option">
                  {opt}
                  <button type="button" onClick={() => setSelectOptions(selectOptions.filter((o) => o !== opt))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="column-property-add-option">
              <input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="New option"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
                      setSelectOptions([...selectOptions, newOption.trim()]);
                      setNewOption("");
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
                    setSelectOptions([...selectOptions, newOption.trim()]);
                    setNewOption("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {type === "ai_enriched" && (
          <label className="column-property-field">
            <span>AI prompt</span>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={5}
              placeholder="Describe what this column should generate for each company…"
            />
          </label>
        )}

        <div className="column-property-section">
          <label className="column-property-check">
            <input
              type="checkbox"
              checked={conditionEnabled}
              onChange={(e) => setConditionEnabled(e.target.checked)}
            />
            Conditional visibility
          </label>
          {conditionEnabled && (
            <div className="column-property-condition">
              <select value={conditionField} onChange={(e) => setConditionField(e.target.value)}>
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value as ColumnConditionOperator)}
              >
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {conditionOperator !== "empty" && conditionOperator !== "not_empty" && (
                <input
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Value"
                />
              )}
            </div>
          )}
          {conditionEnabled && type === "ai_enriched" && (
            <p className="column-property-hint">AI runs only when this condition is met per row.</p>
          )}
        </div>

        {error && <p className="column-property-error">{error}</p>}

        <div className="column-property-actions">
          {type === "ai_enriched" && mode === "edit" && onRunAi && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void onRunAi()}>
              Run on selection
            </button>
          )}
          <button type="submit" className="btn-primary btn-sm" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Add property" : "Save"}
          </button>
        </div>
      </form>
    </aside>
  );
}
