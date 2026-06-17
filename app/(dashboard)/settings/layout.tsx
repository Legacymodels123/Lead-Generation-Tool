"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_NAV = [
  { href: "/settings", label: "Overzicht", icon: "📊" },
  { href: "/settings/team", label: "Team", icon: "👥" },
  { href: "/settings/usage", label: "Gebruik", icon: "📈" },
  { href: "/settings/limits", label: "Limieten", icon: "⚙️" },
  { href: "/settings/account", label: "Account", icon: "👤" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: "24px", minHeight: "100vh" }}>
      <aside
        style={{
          width: "240px",
          borderRight: "1px solid #e5e7eb",
          padding: "24px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "0 16px 24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Instellingen
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {SETTINGS_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: isActive ? "#000" : "#666",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "#f0f0f0" : "transparent",
                  borderLeft: isActive ? "3px solid #000" : "3px solid transparent",
                  paddingLeft: "13px",
                  transition: "all 0.2s",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "24px", maxWidth: "1000px" }}>
        {children}
      </main>
    </div>
  );
}
