"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCompany(user.company);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: name.trim(), company: company.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleDownloadBackup = () => {
    // Mock backup download
    const backup = {
      version: "1.0",
      exported: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Account</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>Beheer je profiel en account instellingen</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Profielgegevens</h2>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                E-mail
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  background: "#f9fafb",
                  color: "#999",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                Bedrijf
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
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
              Opslaan
            </button>

            {saved && (
              <div style={{ marginTop: "12px", padding: "8px", background: "#dcfce7", borderRadius: "4px", fontSize: "12px", color: "#166534" }}>
                ✓ Wijzigingen opgeslagen
              </div>
            )}
          </form>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Backup & Gegevens</h2>

          <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
            Download een backup van je account gegevens.
          </p>

          <button
            onClick={handleDownloadBackup}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "#f0f0f0",
              color: "#000",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            📥 Download Backup
          </button>

          <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "6px", fontSize: "12px", color: "#666" }}>
            <p style={{ margin: 0, marginBottom: "8px" }}>
              <strong>Tip:</strong> Download regelmatig een backup van je account gegevens voor veiligheid.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px", border: "1px solid #fecaca", borderRadius: "8px", background: "#fef2f2" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#991b1b" }}>
          Sessie beëindigen
        </h2>

        <p style={{ fontSize: "13px", color: "#7f1d1d", marginBottom: "16px" }}>
          Je wordt afgemeld van dit apparaat. Je kunt je later opnieuw aanmelden.
        </p>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Uitloggen
        </button>
      </div>
    </>
  );
}
