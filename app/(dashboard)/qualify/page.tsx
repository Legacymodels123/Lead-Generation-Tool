"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import DashboardHeader from "@/components/DashboardHeader";
import FilterBar from "@/components/FilterBar";
import DataTableHeader from "@/components/DataTableHeader";
import type { Lead } from "@/lib/types";

export default function QualifyPage() {
  const { leads, updateLead, showToast } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Map<string, { status: "qualified" | "not_qualified"; reason: string }>>(new Map());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"alle" | "qualified" | "not_qualified">("not_qualified");

  const unqualified = useMemo(() => {
    return leads
      .filter((l) => {
        const matchStatus = statusFilter === "alle" || l.status === statusFilter;
        const matchSearch =
          !search ||
          l.company.toLowerCase().includes(search.toLowerCase()) ||
          l.contactName.toLowerCase().includes(search.toLowerCase()) ||
          l.market.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
      });
  }, [leads, statusFilter, search]);

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
      <DashboardHeader
        title="AI Kwalificatie"
        subtitle="Laat AI bepalen welke leads qualified zijn"
        showStats={false}
        actionButtons={[
          {
            label: running ? "AI denkt na..." : `Kwalificeer ${selectedIds.size}`,
            onClick: runAiQualification,
            variant: "primary",
          },
        ]}
      />

      <div style={{ padding: "0 20px 20px" }}>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={(status) => setStatusFilter(status as "alle" | "qualified" | "not_qualified")}
        />

        {unqualified.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: "14px", color: "#666" }}>
              ✓ Alle leads zijn al gekwalificeerd!
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <DataTableHeader
                title="Leads voor kwalificatie"
                count={unqualified.length}
                selectedCount={selectedIds.size}
                onSelectAll={(selected) => {
                  if (selected) {
                    setSelectedIds(new Set(unqualified.map((l) => l.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
                actions={[
                  {
                    label: "Selecteer alles",
                    onClick: toggleSelectAll,
                    variant: "secondary",
                  },
                  {
                    label: running ? "AI bezig" : "Kwalificeer geselecteerde",
                    onClick: runAiQualification,
                    disabled: selectedIds.size === 0 || running,
                    loading: running,
                  },
                ]}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "0", borderTop: "1px solid #e5e7eb" }}>
              {unqualified.map((lead) => {
                const result = results.get(lead.id);
                const isSelected = selectedIds.has(lead.id);

                return (
                  <div
                    key={lead.id}
                    style={{
                      padding: "16px",
                      borderBottom: "1px solid #e5e7eb",
                      background: result
                        ? result.status === "qualified"
                          ? "#f0fdf4"
                          : "#fef2f2"
                        : isSelected
                          ? "#f0f9ff"
                          : "#fff",
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
                      style={{ marginTop: "4px", cursor: result ? "not-allowed" : "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>
                        {lead.company}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                        {lead.contactName && (
                          <>
                            <span>{lead.contactName}</span> •{" "}
                          </>
                        )}
                        <span>{lead.market}</span> •{" "}
                        <span>{lead.employees} medewerkers</span>
                      </div>
                      {result && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            fontSize: "12px",
                            color: result.status === "qualified" ? "#166534" : "#991b1b",
                            background:
                              result.status === "qualified"
                                ? "#dcfce7"
                                : "#fecaca",
                            borderRadius: "4px",
                            fontWeight: 500,
                          }}
                        >
                          <strong>AI Analyse:</strong> {result.reason}
                        </div>
                      )}
                    </div>
                    {result && (
                      <div
                        style={{
                          padding: "6px 12px",
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
            </div>
          </>
        )}
      </div>
    </>
  );
}
