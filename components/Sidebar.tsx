"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

const NAV = [
  { href: "/leads", label: "Leads", badge: "leads" as const },
  { href: "/qualify", label: "AI Kwalificatie" },
  { href: "/columns", label: "Kolommen" },
];

const ADMIN_NAV = [
  { href: "/integrations-new", label: "Integraties" },
  { href: "/settings", label: "Instellingen" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { leads } = useApp();

  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">
            <span>L</span>
          </div>
          <div className="logo-text">
            <div className="logo-name">
              Legacy Scale
              <br />
              Models
            </div>
            <div className="logo-sub">Lead Intelligence</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Platform</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? " active" : ""}`}
          >
            <div className="nav-dot" />
            {item.label}
            {item.badge === "leads" && <span className="nav-badge">{leads.length}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Beheer</div>
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? " active" : ""}`}
          >
            <div className="nav-dot" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="user-pill">
          <div className="user-avatar">{initial}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.company}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
