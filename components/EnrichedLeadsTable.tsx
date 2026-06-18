'use client';

import { useState, useMemo } from 'react';
import type { Lead } from '@/lib/types';

interface Column {
  key: keyof Lead;
  label: string;
  width: number;
  visible: boolean;
  type: 'text' | 'number' | 'status' | 'date';
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'company', label: 'Company', width: 180, visible: true, type: 'text' },
  { key: 'contactName', label: 'Contact', width: 140, visible: true, type: 'text' },
  { key: 'contactTitle', label: 'Title', width: 130, visible: true, type: 'text' },
  { key: 'sector', label: 'Sector', width: 120, visible: true, type: 'text' },
  { key: 'market', label: 'Market', width: 120, visible: true, type: 'text' },
  { key: 'country', label: 'Country', width: 100, visible: true, type: 'text' },
  { key: 'employees', label: 'Employees', width: 100, visible: false, type: 'number' },
  { key: 'revenue', label: 'Revenue', width: 100, visible: false, type: 'text' },
  { key: 'status', label: 'Status', width: 100, visible: true, type: 'status' },
  { key: 'aiQualificationScore', label: 'AI Score', width: 80, visible: true, type: 'number' },
  { key: 'linkedinUrl', label: 'LinkedIn', width: 100, visible: false, type: 'text' },
];

interface Props {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export default function EnrichedLeadsTable({ leads, selectedLeads, onSelectionChange }: Props) {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [sortColumn, setSortColumn] = useState<keyof Lead | null>('company');
  const [sortDesc, setSortDesc] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Filter
  const filtered = useMemo(() => {
    if (!filterText) return leads;
    const lower = filterText.toLowerCase();
    return leads.filter(
      l =>
        l.company.toLowerCase().includes(lower) ||
        l.contactName.toLowerCase().includes(lower) ||
        l.sector.toLowerCase().includes(lower)
    );
  }, [leads, filterText]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDesc ? bVal - aVal : aVal - bVal;
      }

      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      return sortDesc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });
  }, [filtered, sortColumn, sortDesc]);

  const visibleColumns = columns.filter(c => c.visible);

  const toggleColumn = (key: keyof Lead) => {
    setColumns(cols =>
      cols.map(c => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const toggleAll = () => {
    onSelectionChange(
      selectedLeads.size === sorted.length ? new Set() : new Set(sorted.map(l => l.id))
    );
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedLeads);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      qualified: '#10b981',
      not_qualified: '#ef4444',
      pending: '#f59e0b',
      contacted: '#3b82f6',
    };
    return colors[status] || '#9ca3af';
  };

  const formatValue = (val: any, type: string): string => {
    if (val === null || val === undefined) return '-';
    if (type === 'number') {
      if (typeof val === 'number') return val.toLocaleString();
      return String(val);
    }
    return String(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="Search..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        />
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ⚙ Columns
          </button>
          {showColumnMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '4px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                minWidth: '200px',
                zIndex: 10,
              }}
            >
              {columns.map(col => (
                <label
                  key={col.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumn(col.key)}
                    style={{ cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            background: 'white',
          }}
        >
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 5 }}>
              <th
                style={{
                  width: '40px',
                  padding: '10px',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedLeads.size === sorted.length && sorted.length > 0}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  style={{
                    width: `${col.width}px`,
                    padding: '10px 12px',
                    textAlign: 'left',
                    borderRight: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontWeight: 500,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => {
                    if (sortColumn === col.key) {
                      setSortDesc(!sortDesc);
                    } else {
                      setSortColumn(col.key);
                      setSortDesc(false);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.label}
                    {sortColumn === col.key && <span style={{ fontSize: '11px', color: '#3b82f6' }}>{sortDesc ? '↓' : '↑'}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                  No companies found
                </td>
              </tr>
            ) : (
              sorted.map(lead => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedLeads.has(lead.id) ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as any).style.background = selectedLeads.has(lead.id) ? '#dbeafe' : '#f9fafb';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as any).style.background = selectedLeads.has(lead.id) ? '#eff6ff' : 'white';
                  }}
                >
                  <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleRow(lead.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  {visibleColumns.map(col => (
                    <td
                      key={`${lead.id}-${col.key}`}
                      style={{
                        width: `${col.width}px`,
                        padding: '10px 12px',
                        borderRight: '1px solid #f3f4f6',
                        color: col.type === 'status' ? getStatusColor(String(lead[col.key])) : 'inherit',
                        fontWeight: col.type === 'status' ? 500 : 'normal',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={String(lead[col.key] || '')}
                    >
                      {formatValue(lead[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#666' }}>
        {selectedLeads.size > 0 ? `${selectedLeads.size} selected` : `${sorted.length} of ${leads.length} companies`}
      </div>
    </div>
  );
}
