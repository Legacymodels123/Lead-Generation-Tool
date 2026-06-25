"use client";

import { useMemo, useState } from "react";
import ImportRowsDialog from "@/components/research/ImportRowsDialog";
import ResearchDetailPanel from "@/components/research/ResearchDetailPanel";
import { useResearchWorkspace } from "@/lib/research-workspace";

const FILTERS = ["all", "new", "researching", "ready", "qualified", "rejected"] as const;

export default function WorkspaceGrid() {
  const {
    rows,
    loading,
    selectedRowId,
    query,
    activeStatus,
    setupStatus,
    setQuery,
    setActiveStatus,
    selectRow,
    addRow,
    importRows,
    updateRow,
    runResearch,
    syncToHubSpot,
  } = useResearchWorkspace();
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCount = selectedIds.length;
  const qualifiedCount = useMemo(
    () => rows.filter((row) => row.qualificationStatus === "qualified").length,
    [rows]
  );

  const toggleSelection = (rowId: string) => {
    setSelectedIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  };

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  return (
    <>
      <section className="research-toolbar-panel">
        <div className="research-toolbar-row">
          <input
            className="research-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company, domain, or industry"
          />
          <div className="research-toolbar-actions">
            <button type="button" className="research-secondary-btn" onClick={() => void addRow()}>
              Add row
            </button>
            <button type="button" className="research-secondary-btn" onClick={() => setImportOpen(true)}>
              Import rows
            </button>
            <button
              type="button"
              className="research-primary-btn"
              onClick={() => void runResearch(selectedCount ? selectedIds : rows.map((row) => row.id))}
              disabled={!rows.length || !setupStatus.aiReady}
            >
              Run research
            </button>
            <button
              type="button"
              className="research-secondary-btn"
              onClick={() => void syncToHubSpot(selectedCount ? selectedIds : rows.filter((row) => row.qualificationStatus === "qualified").map((row) => row.id))}
              disabled={!setupStatus.hubspotReady}
            >
              Sync qualified
            </button>
          </div>
        </div>

        <div className="research-filter-row">
          <div className="research-filter-pills">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`research-filter-pill${activeStatus === filter ? " active" : ""}`}
                onClick={() => setActiveStatus(filter)}
              >
                {filter === "all" ? "All rows" : filter}
              </button>
            ))}
          </div>
          <div className="research-inline-stats">
            <span>{rows.length} visible rows</span>
            <span>{qualifiedCount} qualified</span>
            <span>{selectedCount} selected</span>
          </div>
        </div>
      </section>

      <section className="research-workspace-content">
        <div className="research-grid-card">
          <table className="research-grid-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelectedIds(allSelected ? [] : rows.map((row) => row.id))}
                  />
                </th>
                <th>Company</th>
                <th>Domain</th>
                <th>Country</th>
                <th>City</th>
                <th>Industry</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Research summary</th>
                <th>Fit score</th>
                <th>Notes</th>
                <th>Sync</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="research-grid-empty">Loading workspace...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="research-grid-empty">No company rows yet. Add one or import a list to begin.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedRowId === row.id ? "active" : ""}
                    onClick={() => selectRow(row.id)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelection(row.id)}
                      />
                    </td>
                    <td>
                      <input
                        value={row.companyName}
                        onChange={(event) => void updateRow(row.id, { companyName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.domain}
                        onChange={(event) =>
                          void updateRow(row.id, {
                            domain: event.target.value,
                            website: event.target.value ? `https://${event.target.value.replace(/^https?:\/\//, "")}` : "",
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.country}
                        onChange={(event) => void updateRow(row.id, { country: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.city}
                        onChange={(event) => void updateRow(row.id, { city: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.industry}
                        onChange={(event) => void updateRow(row.id, { industry: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.employeeRange}
                        onChange={(event) => void updateRow(row.id, { employeeRange: event.target.value })}
                      />
                    </td>
                    <td>
                      <span className={`research-table-pill status-${row.qualificationStatus}`}>{row.qualificationStatus}</span>
                    </td>
                    <td>
                      <textarea
                        value={row.researchSummary}
                        onChange={(event) =>
                          void updateRow(row.id, {
                            researchSummary: event.target.value,
                            aiSummary: event.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.fitScore ?? ""}
                        onChange={(event) =>
                          void updateRow(row.id, {
                            fitScore: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={row.notes}
                        onChange={(event) => void updateRow(row.id, { notes: event.target.value })}
                      />
                    </td>
                    <td>
                      <span className={`research-table-pill sync-${row.syncStatus}`}>{row.syncStatus}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ResearchDetailPanel />
      </section>

      <ImportRowsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importRows}
      />
    </>
  );
}
