"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { getIcpForWorkspace, getWorkspace } from "@/lib/workspace/context";

export default function SettingsPage() {
  const { user } = useAuth();
  const { workspaceId, leads } = useApp();

  if (!user) return null;

  const workspace = getWorkspace(workspaceId);
  const icp = getIcpForWorkspace(workspaceId);
  const qualifiedLeads = leads.filter((l) => l.status === "qualified").length;
  const totalLeads = leads.length;
  const qualifiedPercentage = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Instellingen</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Beheer je workspace, team en limieten</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div
          style={{
            padding: "20px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Totale Leads
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>{totalLeads}</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {qualifiedLeads} gekwalificeerd ({qualifiedPercentage}%)
          </div>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Teamleden
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>1</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            <Link href="/settings/team" style={{ color: "#000", textDecoration: "underline" }}>
              Team beheren
            </Link>
          </div>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            API Gebruik
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700 }}>0%</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            <Link href="/settings/usage" style={{ color: "#000", textDecoration: "underline" }}>
              Gedetailleerd zien
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div
          style={{
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Workspace</h3>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
            {workspace?.name ?? icp.name}
          </p>
          <p style={{ fontSize: "13px", color: "#999" }}>
            Markten: {icp.markets.map((m) => m.label).join(", ")}
          </p>
        </div>

        <div
          style={{
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Integraties</h3>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
            Verbind API providers en OAuth services
          </p>
          <Link href="/integrations-new" style={{ color: "#000", textDecoration: "underline", fontSize: "13px" }}>
            → Ga naar Integraties
          </Link>
        </div>
      </div>

      <div
        style={{
          padding: "24px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          background: "#fff",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Snelle Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <Link
            href="/settings/team"
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#000",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            👥 Teammanagement
          </Link>
          <Link
            href="/settings/usage"
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#000",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            📈 Gebruiksanalyse
          </Link>
          <Link
            href="/settings/limits"
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#000",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ⚙️ Limieten
          </Link>
          <Link
            href="/settings/account"
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              textDecoration: "none",
              color: "#000",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            👤 Account
          </Link>
        </div>
      </div>
    </>
  );
}
