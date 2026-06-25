'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { CompaniesPanelProvider } from '@/lib/companies-panel-context';
 
const PRIMARY_NAV = [
  { href: '/companies', label: 'Companies', icon: '▦', match: (pathname: string) => pathname.startsWith('/companies') || pathname === '/qualified' },
  { href: '/integrations', label: 'Integrations', icon: '◎', match: (pathname: string) => pathname.startsWith('/integrations') },
  { href: '/automations', label: 'Automations', icon: '◌', match: (pathname: string) => pathname.startsWith('/automations') },
  { href: '/settings', label: 'Settings', icon: '⋯', match: (pathname: string) => pathname.startsWith('/settings') },
];

const SECONDARY_NAV = [
  { href: '/qualified', label: 'Qualified', icon: '✓' },
  { href: '/contacts', label: 'Contacts', icon: '◐' },
];

const SIDEBAR_KEY = 'bl-sidebar-collapsed';

interface Props {
  children: React.ReactNode;
}

function ModernLayoutInner({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { leads, loadingLeads, storageMode, saveStatus, lastSavedAt } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

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
    return null;
  }

  const qualifiedCount = leads.filter((l) => l.status === 'qualified').length;
  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving changes'
      : saveStatus === 'saved'
        ? lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Saved'
        : saveStatus === 'error'
          ? 'Save failed'
          : loadingLeads
            ? 'Loading companies'
            : 'All changes synced';
  const storageLabel =
    storageMode === 'cloud' ? 'Cloud workspace' : storageMode === 'memory' ? 'Local workspace' : 'Workspace';

  return (
    <div className="bl-app">
      <aside className={`bl-sidebar${collapsed ? ' bl-sidebar-collapsed' : ''}`}>
        <div className="bl-sidebar-head">
          <button type="button" className="bl-collapse-btn" onClick={toggleSidebar} title="Toggle sidebar">
            {collapsed ? '→' : '←'}
          </button>
          {!collapsed && (
            <>
              <div className="bl-org-name">{user.company || 'Lead workspace'}</div>
              <div className="bl-org-plan">{storageLabel}</div>
            </>
          )}
        </div>

        <nav className="bl-nav">
          {PRIMARY_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bl-nav-item${active ? ' active' : ''}`}
                title={item.label}
              >
                <span className="bl-nav-icon">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="bl-lists">
            <div className="bl-lists-label">Views</div>
            <div className="bl-lists-section">Pipeline</div>
            <Link
              href="/companies"
              className={`bl-list-item${pathname === '/companies' ? ' active' : ''}`}
            >
              <span className="bl-list-name">All Companies</span>
              <span className="bl-list-count">{leads.length}</span>
            </Link>
            <Link
              href="/qualified"
              className={`bl-list-item${pathname === '/qualified' ? ' active' : ''}`}
            >
              <span className="bl-list-name">Qualified</span>
              <span className="bl-list-count">{qualifiedCount}</span>
            </Link>
            <div className="bl-lists-section">Supporting</div>
            {SECONDARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`bl-list-item${pathname.startsWith(item.href) ? ' active' : ''}`}
              >
                <span className="bl-list-name">{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="bl-sidebar-foot">
          {!collapsed && (
            <div className="bl-sidebar-status">
              <div className={`bl-status-pill bl-status-pill-${storageMode}`}>
                {storageLabel}
              </div>
              <div className={`bl-status-copy bl-status-copy-${saveStatus}`}>{saveLabel}</div>
            </div>
          )}
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
