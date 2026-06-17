"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { getIcpForWorkspace, getWorkspace } from "@/lib/workspace/context";

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { workspaceId } = useApp();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [company, setCompany] = useState(user?.company ?? "");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCompany(user.company);
    }
  }, [user]);

  if (!user) return null;

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateUser({ name: name.trim(), company: company.trim() });
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const workspace = getWorkspace(workspaceId);
  const icp = getIcpForWorkspace(workspaceId);

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Instellingen</span>
        <span className="topbar-sub">— Account & credits</span>
      </div>
      <div className="page-scroll">
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Profiel</div>
            <div className="card-desc">Je accountgegevens</div>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="form-label">Naam</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" value={user.email} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Bedrijf</label>
                <input
                  className="form-input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary">
                Opslaan
              </button>
            </form>
          </div>

        </div>

        <div className="card">
          <div className="card-title">Workspace</div>
          <div className="card-desc">Actieve ICP-configuratie voor lead scoring en AI prompts</div>
          <div className="setting-row">
            <div className="setting-info">
              <h4>{workspace?.name ?? icp.name}</h4>
              <p>{icp.markets.map((m) => m.label).join(" · ")}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Integraties en Kolommen</div>
          <div className="card-desc">Beheer API providers, OAuth verbindingen en kolom instellingen</div>
          <Link href="/integrations-new" className="btn-primary" style={{ display: "inline-block" }}>
            → Ga naar Integraties
          </Link>
        </div>

        <div className="card">
          <div className="setting-row">
            <div className="setting-info">
              <h4>Uitloggen</h4>
              <p>Beëindig je sessie op dit apparaat</p>
            </div>
            <button type="button" className="btn-secondary" onClick={handleLogout}>
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
