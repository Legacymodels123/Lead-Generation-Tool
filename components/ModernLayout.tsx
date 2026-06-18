'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';

const FOOTER_NAV = [
  { href: '/integrations', label: 'Integrations' },
  { href: '/settings', label: 'Settings' },
];

interface Props {
  children: React.ReactNode;
}

export default function ModernLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { leads } = useApp();

  if (loading) {
    return <div className="bl-loading">Loading…</div>;
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
      <aside className="bl-sidebar">
        <div className="bl-sidebar-head">
          <div className="bl-org-name">{user.company || 'Legacy Scale Models'}</div>
          <div className="bl-org-plan">Starter Plan</div>
        </div>

        <nav className="bl-nav">
          <Link href="/companies" className={`bl-nav-item${pathname === '/companies' ? ' active' : ''}`}>
            <span className="bl-nav-icon">▦</span>
            Dashboard
          </Link>
        </nav>

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

        <div className="bl-sidebar-foot">
          {FOOTER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`bl-foot-link${pathname.startsWith(item.href) ? ' active' : ''}`}
            >
              {item.label}
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
            Sign out
          </button>
          <div className="bl-user-email">{user.email}</div>
        </div>
      </aside>

      <main className="bl-main">{children}</main>
    </div>
  );
}
