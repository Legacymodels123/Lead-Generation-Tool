"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { getIcpForWorkspace, getWorkspace } from "@/lib/workspace/context";

const PACKAGES = [
  { credits: 50, price: "€49" },
  { credits: 150, price: "€129" },
  { credits: 500, price: "€399" },
];

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { addCredits, workspaceId } = useApp();
  const router = useRouter();
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[1]);
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

  function handleBuyCredits() {
    addCredits(selectedPkg.credits, `${selectedPkg.credits} credits gekocht (${selectedPkg.price})`);
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

          <div className="card">
            <div className="card-title">Credits saldo</div>
            <div className="card-desc">Huidig saldo: {user.credits} credits</div>
            <div className="credit-packages">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.credits}
                  className={`credit-package${selectedPkg.credits === pkg.credits ? " selected" : ""}`}
                  onClick={() => setSelectedPkg(pkg)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedPkg(pkg)}
                >
                  <div className="credit-package-amount">{pkg.credits}</div>
                  <div className="credit-package-price">{pkg.price}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 16, width: "100%" }}
              onClick={handleBuyCredits}
            >
              Credits kopen (demo)
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Transactiegeschiedenis</div>
          <div className="transaction-list">
            {user.transactions.length === 0 && (
              <p style={{ fontSize: 13, color: "#bbb" }}>Geen transacties.</p>
            )}
            {user.transactions.map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{tx.description}</div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
                    {new Date(tx.createdAt).toLocaleString("nl-NL")}
                  </div>
                </div>
                <div
                  className={`transaction-amount${tx.amount >= 0 ? " positive" : " negative"}`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </div>
              </div>
            ))}
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
