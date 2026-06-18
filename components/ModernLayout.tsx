'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';

const NAV_ITEMS = [
  { href: '/companies', icon: '🏢', label: 'Companies' },
  { href: '/qualified', icon: '✓', label: 'Qualified' },
  { href: '/contacts', icon: '👤', label: 'Contacts' },
  { href: '/automations', icon: '🤖', label: 'Automations' },
  { href: '/integrations', icon: '🔗', label: 'Integrations' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

interface Props {
  children: React.ReactNode;
}

export default function ModernLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const { leads } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fff' }}>
      {/* Left Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '240px' : '70px',
          background: '#1f2937',
          color: 'white',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #374151',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {sidebarOpen && <div style={{ fontWeight: 700, fontSize: '16px' }}>LSM</div>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname.startsWith(item.href);
            let badge = '';
            if (item.href === '/companies') badge = `${leads.length}`;
            if (item.href === '/qualified') badge = `${qualifiedCount}`;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: isActive ? '#374151' : 'transparent',
                  color: isActive ? '#fff' : '#d1d5db',
                  textDecoration: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {sidebarOpen && (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.label}</span>
                    {badge && (
                      <span
                        style={{
                          background: '#4b5563',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div style={{ borderTop: '1px solid #374151', padding: '12px' }}>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#374151',
              color: '#d1d5db',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            {sidebarOpen ? 'Sign Out' : '↪'}
          </button>
          {sidebarOpen && (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
              {user.email}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb' }}>
        {children}
      </main>
    </div>
  );
}
