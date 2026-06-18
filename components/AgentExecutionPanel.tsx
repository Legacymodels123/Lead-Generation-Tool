'use client';

import { useEffect, useState } from 'react';
import { ProgressEvent } from '@/lib/agents/types';

interface ExecutionPanelProps {
  runId: string;
  onClose?: () => void;
}

export default function AgentExecutionPanel({ runId, onClose }: ExecutionPanelProps) {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/agents/progress?runId=${runId}`);

    eventSource.onmessage = (e) => {
      try {
        const event: ProgressEvent = JSON.parse(e.data);

        if (event.type === 'initial') {
          setProgress(event.progress);
          setStatus('running');
        } else if (event.type === 'task_complete') {
          setProgress(event.progress);
          setTasks(prev => [
            ...prev,
            {
              type: 'task',
              leadId: event.leadId,
              status: 'completed',
              timestamp: typeof event.timestamp === 'string' ? event.timestamp : event.timestamp?.toISOString(),
            },
          ]);
        } else if (event.type === 'task_error') {
          setTasks(prev => [
            ...prev,
            {
              type: 'error',
              leadId: event.leadId,
              error: event.data?.error,
              timestamp: typeof event.timestamp === 'string' ? event.timestamp : event.timestamp?.toISOString(),
            },
          ]);
        } else if (event.type === 'run_complete') {
          setProgress(event.progress);
          setStatus('completed');
          setEstimatedTime(null);
          // Close after 2 seconds if there are no errors
          if (!tasks.some(t => t.type === 'error') && onClose) {
            setTimeout(onClose, 2000);
          }
        }

        // Calculate estimated time remaining
        if (event.progress.total > 0) {
          const percentComplete = event.progress.completed / event.progress.total;
          if (percentComplete > 0 && percentComplete < 1) {
            const elapsedMs = Date.now();
            const estimatedTotalMs = elapsedMs / percentComplete;
            const remainingMs = estimatedTotalMs - elapsedMs;
            setEstimatedTime(Math.round(remainingMs / 1000));
          }
        }
      } catch (err) {
        console.error('Failed to parse event', err);
      }
    };

    eventSource.onerror = () => {
      setStatus('failed');
      setError('Connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [runId, onClose, tasks]);

  const percentComplete =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        minWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Agent Execution</h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>
            {progress.completed} / {progress.total}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>{percentComplete}%</span>
        </div>

        <div
          style={{
            height: '8px',
            background: '#f0f0f0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background:
                status === 'completed'
                  ? '#10b981'
                  : status === 'failed'
                    ? '#ef4444'
                    : '#3b82f6',
              width: `${percentComplete}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#666' }}>
          Status: <strong style={{ color: '#000' }}>{status}</strong>
        </div>
        {estimatedTime && estimatedTime > 0 && (
          <div style={{ fontSize: '13px', color: '#666' }}>
            ETA: <strong>{estimatedTime}s</strong>
          </div>
        )}
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <div style={{ marginBottom: '16px', maxHeight: '300px', overflow: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
            Recent Tasks
          </div>
          {tasks.slice(-5).map((task, i) => (
            <div
              key={i}
              style={{
                fontSize: '12px',
                padding: '6px 8px',
                background: task.type === 'error' ? '#fef2f2' : '#f9fafb',
                borderRadius: '4px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: task.type === 'error' ? '#ef4444' : '#10b981',
                }}
              />
              <span style={{ color: task.type === 'error' ? '#dc2626' : '#666' }}>
                {task.type === 'error' ? `Error: ${task.error}` : `Processed: ${task.leadId}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
