"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import type { Lead } from "@/lib/types";

const COLUMNS = [
  { key: "company", label: "Company", width: "180px" },
  { key: "market", label: "Market", width: "100px" },
  { key: "country", label: "Country", width: "80px" },
  { key: "employees", label: "Employees", width: "100px" },
  { key: "sector", label: "Sector", width: "120px" },
  { key: "revenue", label: "Revenue", width: "100px" },
  { key: "website", label: "Website", width: "150px" },
  { key: "contactName", label: "Contact", width: "120px" },
  { key: "status", label: "Status", width: "100px" },
  { key: "score", label: "Score", width: "60px" },
];

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { leads } = useApp();
  const [sortBy, setSortBy] = useState("company");
  const [filterStatus, setFilterStatus] = useState<"all" | "qualified" | "not_qualified">("all");

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const filtered = useMemo(() => {
    let result = leads;

    if (filterStatus !== "all") {
      result = result.filter((l) => l.status === filterStatus);
    }

    return result.sort((a, b) => {
      const aVal = (a as any)[sortBy] || "";
      const bVal = (b as any)[sortBy] || "";
      if (typeof aVal === "string") {
        return aVal.localeCompare(bVal);
      }
      return aVal - bVal;
    });
  }, [leads, sortBy, filterStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>Companies</h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <option value="all">All Status</option>
            <option value="qualified">✓ Qualified</option>
            <option value="not_qualified">✗ Not Qualified</option>
          </select>

          <button
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
            + Add Company
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowX: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => setSortBy(col.key)}
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: col.width,
                    minWidth: col.width,
                    userSelect: "none",
                    background: sortBy === col.key ? "#f0f0f0" : "transparent",
                  }}
                >
                  {col.label}
                  {sortBy === col.key && " ↓"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "#fff";
                }}
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      width: col.width,
                      minWidth: col.width,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.key === "status" ? (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: lead.status === "qualified" ? "#dcfce7" : "#fecaca",
                          color: lead.status === "qualified" ? "#166534" : "#991b1b",
                        }}
                      >
                        {lead.status === "qualified" ? "✓ Qualified" : "✗ Not Qualified"}
                      </span>
                    ) : col.key === "website" ? (
                      <a
                        href={`https://${(lead as any)[col.key]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0066cc", textDecoration: "none" }}
                      >
                        {(lead as any)[col.key] || "-"}
                      </a>
                    ) : (
                      (lead as any)[col.key] || "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "12px",
          fontSize: "12px",
          color: "#666",
          textAlign: "right",
        }}
      >
        Showing {filtered.length} of {leads.length} companies
      </div>
    </div>
  );
}
