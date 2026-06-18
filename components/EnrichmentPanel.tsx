'use client';

import { useState } from 'react';
import AgentExecutionPanel from './AgentExecutionPanel';

interface EnrichmentProperty {
  key: string;
  label: string;
  enabled: boolean;
  providers: string[];
  priority: number;
}

interface Props {
  leadIds: string[];
  onClose: () => void;
}

export default function EnrichmentPanel({ leadIds, onClose }: Props) {
  const [properties, setProperties] = useState<EnrichmentProperty[]>([
    { key: 'company_info', label: 'Company Info', enabled: true, providers: ['openai', 'claude', 'lusha'], priority: 1 },
    { key: 'contact_details', label: 'Contact Details', enabled: true, providers: ['claude', 'openai', 'lusha'], priority: 2 },
    { key: 'firmographics', label: 'Firmographics', enabled: true, providers: ['openai', 'lusha', 'claude'], priority: 3 },
    { key: 'technology_stack', label: 'Technology Stack', enabled: false, providers: ['openai', 'claude'], priority: 4 },
    { key: 'funding_info', label: 'Funding Info', enabled: false, providers: ['openai', 'claude'], priority: 5 },
  ]);

  const [executingRun, setExecutingRun] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const toggleProperty = (key: string) => {
    setProperties(props =>
      props.map(p => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const movePropertyUp = (key: string) => {
    const idx = properties.findIndex(p => p.key === key);
    if (idx > 0) {
      const newProps = [...properties];
      [newProps[idx], newProps[idx - 1]] = [newProps[idx - 1], newProps[idx]];
      setProperties(newProps.map((p, i) => ({ ...p, priority: i + 1 })));
    }
  };

  const movePropertyDown = (key: string) => {
    const idx = properties.findIndex(p => p.key === key);
    if (idx < properties.length - 1) {
      const newProps = [...properties];
      [newProps[idx], newProps[idx + 1]] = [newProps[idx + 1], newProps[idx]];
      setProperties(newProps.map((p, i) => ({ ...p, priority: i + 1 })));
    }
  };

  const handleStartEnrichment = async () => {
    const enabledProps = properties.filter(p => p.enabled);
    const runId = await fetch('/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer token` },
      body: JSON.stringify({
        agentId: 'enrich-waterfall',
        agentType: 'enrichment',
        leadIds,
        config: {
          provider: 'waterfall',
          properties: enabledProps,
          strategy: 'fallback',
        },
      }),
    })
      .then(r => r.json())
      .then(d => d.run.id);

    setExecutingRun(runId);
  };

  if (executingRun) {
    return (
      <div style={{ width: '420px', borderLeft: '1px solid #e5e7eb', overflow: 'auto', padding: '16px', background: '#fafafa' }}>
        <AgentExecutionPanel
          runId={executingRun}
          onClose={() => {
            setExecutingRun(null);
            onClose();
          }}
        />
      </div>
    );
  }

  const enabledCount = properties.filter(p => p.enabled).length;

  return (
    <div style={{ width: '420px', borderLeft: '1px solid #e5e7eb', overflow: 'auto', background: '#fafafa' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Enrichment Strategy</h3>
        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
          Configuring {leadIds.length} lead(s) • {enabledCount} properties selected
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Properties List */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '12px', textTransform: 'uppercase' }}>
            Select Properties (Waterfall Priority)
          </div>

          {properties.map((prop, idx) => (
            <div
              key={prop.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: prop.enabled ? '#f0f9ff' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                marginBottom: '8px',
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={prop.enabled}
                onChange={() => toggleProperty(prop.key)}
                style={{ cursor: 'pointer' }}
              />

              {/* Property Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>{prop.label}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  Providers: {prop.providers.join(' → ')}
                </div>
              </div>

              {/* Priority Badge */}
              {prop.enabled && (
                <div
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {prop.priority}
                </div>
              )}

              {/* Move Buttons */}
              {prop.enabled && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => movePropertyUp(prop.key)}
                    disabled={idx === 0}
                    style={{
                      background: idx === 0 ? '#f3f4f6' : 'white',
                      border: '1px solid #e5e7eb',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      fontSize: '12px',
                      color: idx === 0 ? '#d1d5db' : '#666',
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => movePropertyDown(prop.key)}
                    disabled={idx === properties.length - 1}
                    style={{
                      background: idx === properties.length - 1 ? '#f3f4f6' : 'white',
                      border: '1px solid #e5e7eb',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      cursor: idx === properties.length - 1 ? 'default' : 'pointer',
                      fontSize: '12px',
                      color: idx === properties.length - 1 ? '#d1d5db' : '#666',
                    }}
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Waterfall Info */}
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            color: '#0369a1',
            marginBottom: '16px',
          }}
        >
          <strong>Waterfall Enrichment:</strong> The system will try providers in order. If one fails, it moves to the next.
        </div>

        {/* Advanced Settings */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            width: '100%',
            padding: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#3b82f6',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          {showDetails ? '− Advanced Settings' : '+ Advanced Settings'}
        </button>

        {showDetails && (
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '12px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Max Retries</label>
              <input type="number" defaultValue="3" min="0" max="5" style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Timeout (seconds)</label>
              <input type="number" defaultValue="30" min="10" max="180" style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
            </div>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" defaultChecked />
              Skip already enriched leads
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleStartEnrichment}
            disabled={enabledCount === 0}
            style={{
              flex: 1,
              padding: '10px',
              background: enabledCount === 0 ? '#d1d5db' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: enabledCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Start Enrichment
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: 'white',
              color: '#666',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
