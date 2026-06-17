"use client";

import { useApp } from "@/lib/store";

export default function UsagePage() {
  const { leads } = useApp();

  const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
  const notQualifiedCount = leads.filter((l) => l.status === "not_qualified").length;
  const totalLeads = leads.length;

  // Mock usage data
  const usageStats = {
    leadsCreated: totalLeads,
    leadsEnriched: Math.floor(totalLeads * 0.7),
    apiCallsUsed: Math.floor(totalLeads * 2.5),
    apiCallsLimit: 5000,
    creditsSpent: Math.floor(totalLeads * 3),
    storageUsedGb: 0.2,
    storageLimit: 10,
  };

  const apiUsagePercent = Math.round((usageStats.apiCallsUsed / usageStats.apiCallsLimit) * 100);
  const storagePercent = Math.round((usageStats.storageUsedGb / usageStats.storageLimit) * 100);

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Gebruiksanalyse</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Bekijk je maandelijkse API en opslaggebruik</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" }}>
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Leads aangemaakt
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>{usageStats.leadsCreated}</div>
        </div>

        <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" }}>
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Verrijkt
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>{usageStats.leadsEnriched}</div>
        </div>

        <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" }}>
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Credits besteed
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>{usageStats.creditsSpent}</div>
        </div>

        <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" }}>
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Gekwalificeerd
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>{qualifiedCount}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>API Gebruik</h3>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
              <span>Gebruikt</span>
              <span style={{ fontWeight: 600 }}>
                {usageStats.apiCallsUsed} / {usageStats.apiCallsLimit}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: apiUsagePercent > 80 ? "#ef4444" : "#10b981",
                  width: `${apiUsagePercent}%`,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              {apiUsagePercent}% van maandelijks quotum
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Opslag</h3>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
              <span>Gebruikt</span>
              <span style={{ fontWeight: 600 }}>
                {usageStats.storageUsedGb.toFixed(2)} GB / {usageStats.storageLimit} GB
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "#3b82f6",
                  width: `${storagePercent}%`,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              {storagePercent}% van quota
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Status Verdeling</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
              Gekwalificeerd: <span style={{ fontWeight: 600 }}>{qualifiedCount}</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "24px",
                background: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "#10b981",
                  width: `${totalLeads > 0 ? (qualifiedCount / totalLeads) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
              Niet gekwalificeerd: <span style={{ fontWeight: 600 }}>{notQualifiedCount}</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "24px",
                background: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "#ef4444",
                  width: `${totalLeads > 0 ? (notQualifiedCount / totalLeads) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
