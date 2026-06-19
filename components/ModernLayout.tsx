'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { CompaniesPanelProvider } from '@/lib/companies-panel-context';
import CompaniesListPanel from '@/components/CompaniesListPanel';

const FOOTER_NAV = [
  { href: '/integrations', label: 'Integrations' },
  { href: '/settings', label: 'Settings' },
];

const SIDEBAR_KEY = 'bl-sidebar-collapsed';

interface Props {
  children: React.ReactNode;
}

function ModernLayoutInner({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { leads } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === '1') setCollapsed(true);
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  }

  const showCompaniesPanel =
    pathname === '/companies' ||
    pathname.startsWith('/companies/') ||
    pathname === '/qualified';

  if (loading) {
    return (
      <div className="bl-app">
        <aside className={`bl-sidebar${collapsed ? ' bl-sidebar-collapsed' : ''}`}>
          <div className="bl-sidebar-skeleton" />
        </aside>
        <main className="bl-main">
          <div className="bl-loading">Loading…</div>
        </main>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const qualifiedCount = leads.filter((l) => l.status === 'qualified').length;
  const companyLists = [
    { href: '/companies', label: 'All Companies', count: leads.length, active: pathname === '/companies' },
    { href: '/qualified', label: 'Qualified', count: qualifiedCount, active: pathname === '/qualified' },
  ];

  return (
    <div className="bl-app">
      <aside className={`bl-sidebar${collapsed ? ' bl-sidebar-collapsed' : ''}`}>
        <div className="bl-sidebar-head">
          <button type="button" className="bl-collapse-btn" onClick={toggleSidebar} title="Toggle sidebar">
            {collapsed ? '→' : '←'}
          </button>
          {!collapsed && (
            <>
              <div className="bl-org-name">{user.company || 'Legacy Scale Models'}</div>
              <div className="bl-org-plan">Starter Plan</div>
            </>
          )}
        </div>

        <nav className="bl-nav">
          <Link
            href="/companies"
            className={`bl-nav-item${pathname === '/companies' ? ' active' : ''}`}
            title="Dashboard"
          >
            <span className="bl-nav-icon">▦</span>
            {!collapsed && 'Dashboard'}
          </Link>
          <Link
            href="/workspace"
            className={`bl-nav-item${pathname.startsWith('/workspace') ? ' active' : ''}`}
            title="Lead workspace"
          >
            <span className="bl-nav-icon">⊞</span>
            {!collapsed && 'Lead workspace'}
          </Link>
        </nav>

        {!collapsed && (
          <div className="bl-lists">
            <div className="bl-lists-label">Lists</div>
            <div className="bl-lists-section">Companies</div>
            {companyLists.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`bl-list-item${item.active ? ' active' : ''}`}
              >
                <span className="bl-list-name">{item.label}</span>
                <span className="bl-list-count">{item.count}</span>
              </Link>
            ))}
            <div className="bl-lists-section">Contacts</div>
            <Link
              href="/contacts"
              className={`bl-list-item${pathname === '/contacts' ? ' active' : ''}`}
            >
              <span className="bl-list-name">All Contacts</span>
            </Link>
            <Link
              href="/automations"
              className={`bl-list-item${pathname === '/automations' ? ' active' : ''}`}
            >
              <span className="bl-list-name">Automations</span>
            </Link>
          </div>
        )}

        <div className="bl-sidebar-foot">
          {FOOTER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`bl-foot-link${pathname.startsWith(item.href) ? ' active' : ''}`}
              title={item.label}
            >
              {collapsed ? item.label[0] : item.label}
            </Link>
          ))}
          <button
            type="button"
            className="bl-signout"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            {collapsed ? '↪' : 'Sign out'}
          </button>
          {!collapsed && <div className="bl-user-email">{user.email}</div>}
        </div>
      </aside>

      <main className="bl-main">{children}</main>

      {showCompaniesPanel && <CompaniesListPanel />}
    </div>
  );
}

export default function ModernLayout({ children }: Props) {
  return (
    <CompaniesPanelProvider>
      <ModernLayoutInner>{children}</ModernLayoutInner>
    </CompaniesPanelProvider>
  );
}
