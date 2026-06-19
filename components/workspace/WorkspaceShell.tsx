"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/workspace", label: "Leads", icon: "▦" },
  { href: "/workspace/imports", label: "Imports", icon: "↑" },
  { href: "/workspace/enrichment", label: "Enrichment Jobs", icon: "◎" },
  { href: "/workspace/settings", label: "Settings", icon: "⚙" },
];

export default function WorkspaceShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="ws-app">
        <div className="ws-loading-full">Loading workspace…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="ws-app">
      <aside className="ws-sidebar">
        <div className="ws-brand">
          <div className="ws-brand-mark">L</div>
          <div>
            <div className="ws-brand-name">Lead Workspace</div>
            <div className="ws-brand-sub">B2B Intelligence</div>
          </div>
        </div>

        <nav className="ws-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`ws-nav-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="ws-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ws-sidebar-foot">
          <div className="ws-user-name">{user.name || user.email}</div>
          <button type="button" className="ws-link-btn" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="ws-main">
        {(title || subtitle) && (
          <header className="ws-page-header">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
