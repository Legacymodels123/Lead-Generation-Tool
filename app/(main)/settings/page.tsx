"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useApp();
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    showToast("✓ Logged out successfully");
    router.push("/login");
  };

  const handleBackupDownload = async () => {
    setDownloadingBackup(true);
    try {
      const allData = {
        user,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lead-intelligence-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      showToast("✓ Backup downloaded successfully");
    } catch (error) {
      showToast("✗ Failed to download backup");
    } finally {
      setDownloadingBackup(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Settings</h1>
        <p style={{ color: "#666", fontSize: "13px" }}>Manage your account and preferences</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
        {/* Account Section */}
        <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Account</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Email:</span>
              <span style={{ fontWeight: 500 }}>{user.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Name:</span>
              <span style={{ fontWeight: 500 }}>{user.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Company:</span>
              <span style={{ fontWeight: 500 }}>{user.company}</span>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Data Management</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={handleBackupDownload}
              disabled={downloadingBackup}
              style={{
                padding: "10px 14px",
                background: "#f0f0f0",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: downloadingBackup ? "not-allowed" : "pointer",
                opacity: downloadingBackup ? 0.6 : 1,
              }}
            >
              {downloadingBackup ? "Downloading..." : "📥 Download Backup"}
            </button>
            <p style={{ fontSize: "12px", color: "#666" }}>
              Download all your data as a JSON file for backup or export purposes
            </p>
          </div>
        </div>

        {/* Session Section */}
        <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Session</h2>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Info Section */}
        <div
          style={{
            marginTop: "auto",
            padding: "16px",
            background: "#f0f9ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#0c4a6e",
          }}
        >
          <strong>About</strong>
          <div style={{ marginTop: "8px" }}>
            <div>Lead Intelligence Platform v1.0</div>
            <div style={{ marginTop: "4px", color: "#0c4a6e", opacity: 0.7 }}>
              Built for Legacy Scale Models
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
