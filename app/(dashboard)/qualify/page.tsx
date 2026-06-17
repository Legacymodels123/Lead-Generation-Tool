"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Lead } from "@/lib/types";

export default function QualifyPage() {
  const { leads, updateLead, showToast } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Map<string, { status: "qualified" | "not_qualified"; reason: string }>>(new Map());

  const unqualified = useMemo(() => {
    return leads.filter((l) => l.status === "not_qualified");
  }, [leads]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === unqualified.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unqualified.map((l) => l.id)));
    }
  }, [selectedIds.size, unqualified]);

  async function runAiQualification() {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      showToast("Selecteer leads om te kwalificeren");
      return;
    }

    setRunning(true);
    setResults(new Map());

    try {
      const response = await fetch("/api/leads/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });

      if (!response.ok) {
        throw new Error("Qualification failed");
      }

      const data = await response.json();

      // Update leads based on AI results
      for (const result of data.results) {
        updateLead(result.leadId, {
          status: result.status,
          aiSummary: result.reason,
        });
      }

      setResults(new Map(data.results.map((r: any) => [r.leadId, r])));
      showToast(`✓ ${data.results.length} leads gekwalificeerd door AI`);
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast(`✗ Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">AI Kwalificatie</span>
        <span className="topbar-sub">— Laat AI bepalen welke leads qualified zijn</span>
      </div>

      <div className="content" style={{ padding: "20px" }}>
        <div className="card">
          <div className="card-title">Niet gekwalificeerde Leads</div>
          <div className="card-desc">
            Selecteer leads voor AI kwalificatie ({unqualified.length} beschikbaar)
          </div>
        </div>

        {unqualified.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: "center", color: "#999" }}>
              ✓ Alle leads zijn al gekwalificeerd!
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={toggleSelectAll}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                {selectedIds.size === unqualified.length ? "Deselecteer alles" : "Selecteer alles"}
              </button>
              <button
                onClick={runAiQualification}
                disabled={running || selectedIds.size === 0}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {running ? "AI denkt na..." : `Kwalificeer ${selectedIds.size} leads`}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {unqualified.map((lead) => {
                const result = results.get(lead.id);
                const isSelected = selectedIds.has(lead.id);

                return (
                  <div
                    key={lead.id}
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      background: result
                        ? result.status === "qualified"
                          ? "#dcfce7"
                          : "#fef2f2"
                        : isSelected
                          ? "#f0f9ff"
                          : "#fafafa",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      disabled={result !== undefined}
                      style={{ marginTop: "2px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{lead.company}</div>
                      <div style={{ fontSize: "13px", color: "#666" }}>
                        {lead.contactName && `${lead.contactName} • `}
                        {lead.market} • {lead.employees} medewerkers
                      </div>
                      {result && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            color: result.status === "qualified" ? "#166534" : "#991b1b",
                            fontStyle: "italic",
                          }}
                        >
                          AI: {result.reason}
                        </div>
                      )}
                    </div>
                    {result && (
                      <div
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background:
                            result.status === "qualified" ? "#dcfce7" : "#fecaca",
                          color:
                            result.status === "qualified" ? "#166534" : "#991b1b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {result.status === "qualified" ? "✓ Qualified" : "✗ Not qualified"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
