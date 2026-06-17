'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import CompaniesSpreadsheet from '@/components/CompaniesSpreadsheet';

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <CompaniesSpreadsheet />
    </div>
  );
}
