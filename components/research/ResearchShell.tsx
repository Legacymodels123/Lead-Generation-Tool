"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useResearchWorkspace } from "@/lib/research-workspace";

const NAV_ITEMS = [
  { href: "/workspace", label: "Workspace" },
  { href: "/setup", label: "Setup" },
  { href: "/settings", label: "Settings" },
];

export default function ResearchShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { rows, storageMode, saveState, lastSavedAt, setupStatus } = useResearchWorkspace();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="research-app-shell">
      <aside className="research-sidebar">
        <div className="research-brand">
          <span className="research-brand-kicker">Lead Research Workspace</span>
          <strong>{user?.company || "Legacy Scale Models"}</strong>
          <p>Research and enrich company rows before they hit your CRM.</p>
        </div>

        <nav className="research-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`research-nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="research-sidebar-cards">
          <div className="research-mini-card">
            <span>Rows in workspace</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="research-mini-card">
            <span>AI setup</span>
            <strong>{setupStatus.aiReady ? "Ready" : "Missing"}</strong>
          </div>
          <div className="research-mini-card">
            <span>HubSpot</span>
            <strong>{setupStatus.hubspotReady ? "Connected" : "Optional"}</strong>
          </div>
        </div>

        <button
          type="button"
          className="research-signout"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </aside>

      <div className="research-main-shell">
        <header className="research-page-head">
          <div>
            <div className="research-page-kicker">{storageMode === "cloud" ? "Cloud mode" : storageMode === "memory" ? "Local mode" : "Loading mode"}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="research-head-status">
            <div className="research-head-card">
              <span>Save state</span>
              <strong>
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                      ? "Failed"
                      : "Ready"}
              </strong>
            </div>
            <div className="research-head-card">
              <span>Last sync</span>
              <strong>
                {lastSavedAt
                  ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Not yet"}
              </strong>
            </div>
          </div>
        </header>

        <main className="research-page-body">{children}</main>
      </div>
    </div>
  );
}
