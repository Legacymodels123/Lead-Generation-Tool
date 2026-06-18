'use client';

import { useState, useCallback, useMemo } from 'react';
import { useApp } from '@/lib/store';
import type { Lead } from '@/lib/types';

interface Column {
  key: keyof Lead;
  label: string;
  width: number;
  sortable: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

const COLUMNS: Column[] = [
  { key: 'company', label: 'Company', width: 200, sortable: true },
  { key: 'contactName', label: 'Contact', width: 150, sortable: true },
  { key: 'contactTitle', label: 'Title', width: 150, sortable: true },
  { key: 'sector', label: 'Sector', width: 120, sortable: true },
  { key: 'market', label: 'Market', width: 120, sortable: true },
  { key: 'country', label: 'Country', width: 100, sortable: true },
  { key: 'employees', label: 'Employees', width: 100, sortable: true },
  { key: 'status', label: 'Status', width: 100, sortable: true },
  { key: 'aiQualificationScore', label: 'Score', width: 80, sortable: true },
];

export default function CompaniesSpreadsheet() {
  const { leads } = useApp();
  const [sortColumn, setSortColumn] = useState<keyof Lead | null>('company');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; key: keyof Lead } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!filterText) return leads;
    const lower = filterText.toLowerCase();
    return leads.filter(
      lead =>
        lead.company.toLowerCase().includes(lower) ||
        lead.contactName.toLowerCase().includes(lower) ||
        lead.sector.toLowerCase().includes(lower)
    );
  }, [leads, filterText]);

  // Sort leads
  const sortedLeads = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredLeads;

    const sorted = [...filteredLeads].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle different types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();

      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [filteredLeads, sortColumn, sortDirection]);

  // Handle header click for sorting
  const handleHeaderClick = useCallback((key: keyof Lead) => {
    if (sortColumn === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Handle row selection
  const toggleRowSelect = useCallback((leadId: string, multiSelect: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (multiSelect && next.has(leadId)) {
        next.delete(leadId);
      } else if (multiSelect) {
        next.add(leadId);
      } else {
        if (next.has(leadId)) {
          next.delete(leadId);
        } else {
          next.clear();
          next.add(leadId);
        }
      }
      return next;
    });
  }, []);

  // Handle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === sortedLeads.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedLeads.map(l => l.id)));
    }
  }, [sortedLeads, selectedRows.size]);

  // Format cell value
  const formatValue = (value: any, key: keyof Lead): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (key === 'aiQualificationScore') return `${Math.round(value)}%`;
      if (key === 'employees') return value.toLocaleString();
      return String(value);
    }
    return String(value);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '0 16px' }}>
        <input
          type="text"
          placeholder="Search companies, contacts, sectors..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        {selectedRows.size > 0 && (
          <div style={{ color: '#666', fontSize: '13px' }}>
            {selectedRows.size} selected
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid #e5e7eb' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          {/* Header */}
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th
                style={{
                  width: '40px',
                  padding: '8px',
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb',
                  cursor: 'pointer',
                }}
                onClick={toggleSelectAll}
              >
                <input
                  type="checkbox"
                  checked={selectedRows.size === sortedLeads.length && sortedLeads.length > 0}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  style={{
                    width: `${col.width}px`,
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderRight: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontWeight: 500,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  onClick={() => col.sortable && handleHeaderClick(col.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {sortColumn === col.key && (
                      <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {sortedLeads.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  No companies found
                </td>
              </tr>
            ) : (
              sortedLeads.map(lead => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedRows.has(lead.id) ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as any).style.background = selectedRows.has(lead.id)
                      ? '#dbeafe'
                      : '#f9fafb';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as any).style.background = selectedRows.has(lead.id)
                      ? '#eff6ff'
                      : 'white';
                  }}
                >
                  {/* Checkbox */}
                  <td
                    style={{
                      width: '40px',
                      padding: '8px',
                      textAlign: 'center',
                      borderRight: '1px solid #e5e7eb',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(lead.id)}
                      onChange={e => toggleRowSelect(lead.id, (e.nativeEvent as any).ctrlKey || (e.nativeEvent as any).metaKey)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>

                  {/* Data cells */}
                  {COLUMNS.map(col => {
                    const value = lead[col.key];
                    const isEditing = editingCell?.id === lead.id && editingCell?.key === col.key;

                    return (
                      <td
                        key={`${lead.id}-${col.key}`}
                        style={{
                          width: `${col.width}px`,
                          padding: '8px 12px',
                          borderRight: '1px solid #e5e7eb',
                          cursor: 'text',
                          color: col.key === 'status' ? getStatusColor(String(value)) : 'inherit',
                          fontWeight: col.key === 'status' ? 500 : 'normal',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onDoubleClick={() => {
                          setEditingCell({ id: lead.id, key: col.key });
                          setEditValue(formatValue(value, col.key));
                        }}
                        title={formatValue(value, col.key)}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') setEditingCell(null);
                              if (e.key === 'Escape') {
                                setEditingCell(null);
                                setEditValue('');
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '4px',
                              border: '1px solid #3b82f6',
                              borderRadius: '3px',
                              fontSize: '13px',
                            }}
                          />
                        ) : (
                          formatValue(value, col.key)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          color: '#666',
          fontSize: '13px',
        }}
      >
        Showing {sortedLeads.length} of {leads.length} companies
      </div>
    </div>
  );
}
