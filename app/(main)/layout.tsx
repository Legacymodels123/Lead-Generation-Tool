"use client";


import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

const MAIN_NAV = [
  { href: "/companies", icon: "🏢", label: "Companies", badge: "total" },
  { href: "/qualified", icon: "✓", label: "Qualified", badge: "qualified" },
  { href: "/contacts", icon: "👤", label: "Contacts" },
  { href: "/automations", icon: "🤖", label: "Automations" },
  { href: "/integrations", icon: "🔗", label: "Integrations" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { leads } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>;
  }

  const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
  const totalCount = leads.length;

  const filteredLeads = leads.filter(
    (l) =>
      !searchQuery ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar - Navigation */}
      <aside
        style={{
          width: sidebarOpen ? "240px" : "60px",
          borderRight: "1px solid #e5e7eb",
          background: "#fafafa",
          transition: "width 0.3s",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: "100%",
              padding: "8px",
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        <nav
          style={{
            flex: 1,
            padding: "8px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {MAIN_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            let badge = "";
            if (item.badge === "total") badge = String(totalCount);
            if (item.badge === "qualified") badge = String(qualifiedCount);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  background: isActive ? "#000" : "transparent",
                  color: isActive ? "#fff" : "#666",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s",
                  whiteSpace: sidebarOpen ? "nowrap" : "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                }}
              >
                <span>{item.icon}</span>
                {sidebarOpen && (
                  <span style={{ flex: 1 }}>
                    {item.label}
                    {badge && (
                      <span
                        style={{
                          marginLeft: "8px",
                          background: isActive ? "#fff" : "#f0f0f0",
                          color: isActive ? "#000" : "#666",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            padding: "12px",
            borderTop: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div
            style={{
              padding: "8px",
              borderRadius: "6px",
              fontSize: "12px",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => logout().then(() => (window.location.href = "/login"))}
            title="Logout"
          >
            {sidebarOpen ? "Logout" : "↪"}
          </div>
        </div>
      </aside>

      {/* Right Sidebar - Companies List */}
      <aside
        style={{
          width: "250px",
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px" }}>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {filteredLeads.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "12px" }}>
              No companies found
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/companies/${lead.id}`}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  background: pathname.includes(lead.id) ? "#f0f0f0" : "transparent",
                  textDecoration: "none",
                  color: "#000",
                  borderLeft: pathname.includes(lead.id) ? "3px solid #000" : "3px solid transparent",
                  paddingLeft: "9px",
                  transition: "all 0.2s",
                  fontSize: "13px",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lead.company}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {lead.market}
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
