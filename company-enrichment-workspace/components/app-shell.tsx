"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/workspace", label: "Workspace" },
  { href: "/setup", label: "Setup" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="nav">
        <div>
          <div className="eyebrow">Greenfield launch</div>
          <h1>Company Enrichment Workspace</h1>
          <p>
            A dynamic operator board for creating properties, enriching company data,
            and keeping everything in sync with HubSpot.
          </p>
        </div>

        <nav className="nav-links">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <section className="hero">
          <div>
            <div className="eyebrow">Airtable / HubSpot / Excel hybrid</div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <div className="stats">
            <div className="stat">
              <span>Primary AI</span>
              <strong>Claude</strong>
            </div>
            <div className="stat">
              <span>Enrichment</span>
              <strong>Hunter + Lusha</strong>
            </div>
            <div className="stat">
              <span>CRM sync</span>
              <strong>2-way HubSpot</strong>
            </div>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}
