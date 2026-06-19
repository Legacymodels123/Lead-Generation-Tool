"use client";

import { useState } from "react";
import ColumnBuilder from "@/components/ColumnBuilder";
import type { ColumnAutomation, CustomColumnType } from "@/lib/types";

interface ColumnManagerProps {
  workspaceId: string;
  onColumnAdded: () => void;
}

export default function ColumnManager({ workspaceId, onColumnAdded }: ColumnManagerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(column: {
    label: string;
    type: CustomColumnType;
    selectOptions?: string[];
    defaultValue?: string;
    automation?: ColumnAutomation;
  }) {
    setSaving(true);
    try {
      const response = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          label: column.label,
          type: column.type,
          selectOptions: column.selectOptions,
          defaultValue: column.defaultValue,
          automation: column.automation,
          aiPrompt: column.automation?.prompt,
        }),
      });
      if (response.ok) {
        onColumnAdded();
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="btn-secondary btn-sm"
        type="button"
        onClick={() => setOpen(true)}
        disabled={saving}
      >
        + Column
      </button>
      {open && (
        <ColumnBuilder
          onAdd={handleAdd}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
