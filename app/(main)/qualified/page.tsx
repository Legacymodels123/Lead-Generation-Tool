"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import Link from "next/link";

export default function QualifiedPage() {
  const { leads, updateLead, showToast } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  const qualified = useMemo(() => {
    return leads.filter((l) => l.status === "qualified");
  }, [leads]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const runExport = async () => {
    if (selectedIds.size === 0) {
      showToast("✗ Select companies to export");
      return;
    }

    setRunning(true);
    try {
      const data = qualified.filter((l) => selectedIds.has(l.id));
      const csv = [
        ["Company", "Contact", "Email", "LinkedIn", "Market", "Country"].join(","),
        ...data.map((l) =>
          [l.company, l.contactName, l.contacts[0]?.email || "", l.linkedinUrl, l.market, l.country].join(
            ","
          )
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qualified-companies-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();

      showToast(`✓ Exported ${selectedIds.size} companies`);
    } catch (error) {
      showToast("✗ Export failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
          Qualified Companies
        </h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          {qualified.length} companies ready for outreach
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() =>
              setSelectedIds(new Set(qualified.map((l) => l.id)))
            }
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Select All
          </button>

          <button
            onClick={runExport}
            disabled={selectedIds.size === 0 || running}
            style={{
              padding: "8px 16px",
              background: selectedIds.size === 0 ? "#ccc" : "#000",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Exporting..." : `📥 Export ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {qualified.map((lead) => (
            <div
              key={lead.id}
              style={{
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: selectedIds.has(lead.id) ? "#f0f9ff" : "#fff",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  style={{ marginTop: "4px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    {lead.company}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                    {lead.contactName && `${lead.contactName} • `}
                    {lead.market} • {lead.employees} employees
                  </div>

                  {lead.contacts.length > 0 && (
                    <div style={{ fontSize: "12px", background: "#f9fafb", padding: "8px", borderRadius: "4px", marginBottom: "8px" }}>
                      <strong>Contacts:</strong>
                      {lead.contacts.map((c) => (
                        <div key={c.id} style={{ marginTop: "4px" }}>
                          {c.name} ({c.title}) - {c.email}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        background: "#0a66c2",
                        color: "#fff",
                        borderRadius: "4px",
                        textDecoration: "none",
                      }}
                    >
                      LinkedIn
                    </a>
                    {lead.website && (
                      <a
                        href={`https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          background: "#0066cc",
                          color: "#fff",
                          borderRadius: "4px",
                          textDecoration: "none",
                        }}
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
