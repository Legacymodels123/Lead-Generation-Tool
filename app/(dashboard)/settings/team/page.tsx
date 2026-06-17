"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function TeamPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [invitations, setInvitations] = useState<Array<{ email: string; role: string; sentAt: string }>>([]);

  if (!user) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setInvitations([...invitations, { email, role, sentAt: new Date().toLocaleDateString("nl-NL") }]);
    setEmail("");
    setRole("member");
  };

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Team</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Beheer teamleden en machtigingen</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div
          style={{
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Teamleden</h2>

          <div
            style={{
              padding: "16px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 8px",
                background: "#f0f0f0",
                borderRadius: "4px",
                color: "#000",
              }}
            >
              Admin
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#999" }}>
            Je bent de enige teamlid in deze workspace. Voeg meer leden toe via de form hiernaast.
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
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Uitnodiging verzenden</h2>

          <form onSubmit={handleInvite}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              >
                <option value="member">Lid</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
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
              Uitnodiging verzenden
            </button>
          </form>
        </div>
      </div>

      {invitations.length > 0 && (
        <div
          style={{
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
            marginTop: "24px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Openstaande uitnodigingen</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {invitations.map((inv, i) => (
              <div
                key={i}
                style={{
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{inv.email}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Verzonden: {inv.sentAt}</div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 8px",
                    background: "#fef3c7",
                    borderRadius: "4px",
                    color: "#92400e",
                  }}
                >
                  Afwachting
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
