"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  showStats?: boolean;
  actionButtons?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary";
  }>;
}

export default function DashboardHeader({
  title,
  subtitle,
  showStats = true,
  actionButtons = [],
}: DashboardHeaderProps) {
  const { leads } = useApp();
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === "qualified").length;
  const qualifiedPercent = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "14px", color: "#666" }}>{subtitle}</p>
          )}
        </div>

        {actionButtons.length > 0 && (
          <div style={{ display: "flex", gap: "12px" }}>
            {actionButtons.map((btn, i) => {
              const Component = btn.href ? Link : "button";
              return (
                <Component
                  key={i}
                  href={btn.href}
                  onClick={btn.onClick}
                  style={{
                    padding: "10px 16px",
                    background: btn.variant === "secondary" ? "#f0f0f0" : "#000",
                    color: btn.variant === "secondary" ? "#000" : "#fff",
                    border: btn.variant === "secondary" ? "1px solid #e5e7eb" : "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                  as={Component as any}
                >
                  {btn.label}
                </Component>
              );
            })}
          </div>
        )}
      </div>

      {showStats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "#fafafa",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Totale Leads
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{totalLeads}</div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#fafafa",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Gekwalificeerd
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {qualifiedLeads} <span style={{ fontSize: "14px", color: "#666" }}>({qualifiedPercent}%)</span>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#fafafa",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Niet Gekwalificeerd
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>
              {totalLeads - qualifiedLeads}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
