'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import EnrichedLeadsTable from '@/components/EnrichedLeadsTable';
import EnrichmentPanel from '@/components/EnrichmentPanel';

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { leads } = useApp();
  const [showEnrichmentPanel, setShowEnrichmentPanel] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: '0' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Companies</h2>
            <span style={{ color: '#999', fontSize: '13px' }}>({leads.length})</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedLeads.size > 0 && (
              <button
                onClick={() => setShowEnrichmentPanel(!showEnrichmentPanel)}
                style={{
                  padding: '8px 12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Enrich ({selectedLeads.size})
              </button>
            )}
            <button
              style={{
                padding: '8px 12px',
                background: '#f3f4f6',
                color: '#666',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Table */}
        <EnrichedLeadsTable
          leads={leads}
          selectedLeads={selectedLeads}
          onSelectionChange={setSelectedLeads}
        />
      </div>

      {/* Enrichment Panel */}
      {showEnrichmentPanel && selectedLeads.size > 0 && (
        <EnrichmentPanel
          leadIds={Array.from(selectedLeads)}
          onClose={() => setShowEnrichmentPanel(false)}
        />
      )}
    </div>
  );
}
