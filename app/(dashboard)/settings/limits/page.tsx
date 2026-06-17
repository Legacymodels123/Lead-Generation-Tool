"use client";

export default function LimitsPage() {
  const limits = {
    monthlyApiCalls: { current: 1200, limit: 5000 },
    customColumns: { current: 3, limit: 20 },
    teamMembers: { current: 1, limit: 5 },
    storageGb: { current: 0.2, limit: 10 },
  };

  const getLimitColor = (current: number, limit: number) => {
    const percent = (current / limit) * 100;
    if (percent > 80) return "#ef4444";
    if (percent > 50) return "#f59e0b";
    return "#10b981";
  };

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Limieten en Quota</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Bekijk je huidige usage limieten</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>📞 Maandelijkse API Calls</h3>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#666" }}>
              {limits.monthlyApiCalls.current} / {limits.monthlyApiCalls.limit}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: getLimitColor(limits.monthlyApiCalls.current, limits.monthlyApiCalls.limit),
                width: `${Math.min((limits.monthlyApiCalls.current / limits.monthlyApiCalls.limit) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {100 - Math.round((limits.monthlyApiCalls.current / limits.monthlyApiCalls.limit) * 100)}% beschikbaar
          </p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>📊 Aangepaste Kolommen</h3>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#666" }}>
              {limits.customColumns.current} / {limits.customColumns.limit}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: getLimitColor(limits.customColumns.current, limits.customColumns.limit),
                width: `${Math.min((limits.customColumns.current / limits.customColumns.limit) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {limits.customColumns.limit - limits.customColumns.current} meer kolommen beschikbaar
          </p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>👥 Teamleden</h3>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#666" }}>
              {limits.teamMembers.current} / {limits.teamMembers.limit}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: getLimitColor(limits.teamMembers.current, limits.teamMembers.limit),
                width: `${Math.min((limits.teamMembers.current / limits.teamMembers.limit) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {limits.teamMembers.limit - limits.teamMembers.current} meer leden beschikbaar
          </p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>💾 Opslag</h3>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#666" }}>
              {limits.storageGb.current.toFixed(2)} / {limits.storageGb.limit} GB
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: getLimitColor(limits.storageGb.current, limits.storageGb.limit),
                width: `${Math.min((limits.storageGb.current / limits.storageGb.limit) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {(limits.storageGb.limit - limits.storageGb.current).toFixed(2)} GB beschikbaar
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "32px",
          padding: "24px",
          border: "2px solid #fef3c7",
          borderRadius: "8px",
          background: "#fffbeb",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: "#92400e" }}>
          💡 Limieten verhogen?
        </h3>
        <p style={{ fontSize: "13px", color: "#78350f", marginBottom: "12px" }}>
          Upgrade naar een hoger plan om meer API calls, team members, en opslagcapaciteit te krijgen.
        </p>
        <button
          style={{
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
          Plan bijwerken
        </button>
      </div>
    </>
  );
}
