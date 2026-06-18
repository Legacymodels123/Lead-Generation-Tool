// Agent type definitions and interfaces

export type AgentType = 'enrichment' | 'qualify' | 'generate' | 'message' | 'integration' | 'custom';
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ProviderType = 'claude' | 'openai' | 'lusha' | 'hubspot' | 'linkedin' | 'email' | 'webhook';

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description: string;
  type: AgentType;
  enabled: boolean;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  provider: ProviderType;
  fields?: string[];
  sources?: ProviderType[];
  batchSize?: number;
  parallelTasks?: number;
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  workspaceId: string;
  userId: string;
  status: AgentStatus;
  startedAt?: Date;
  completedAt?: Date;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
}

export interface AgentTask {
  id: string;
  runId: string;
  agentId: string;
  leadId: string;
  status: TaskStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSchedule {
  id: string;
  agentId: string;
  workspaceId: string;
  userId: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressEvent {
  type: 'initial' | 'task_start' | 'task_complete' | 'task_error' | 'run_complete';
  runId: string;
  taskId?: string;
  leadId?: string;
  progress: { completed: number; total: number };
  estimatedTimeRemaining?: number;
  data?: Record<string, any>;
  timestamp: Date | string;
}

export interface AgentExecutionContext {
  runId: string;
  agentId: string;
  agentConfig: AgentConfig;
  workspaceId: string;
  userId: string;
  leadIds: string[];
  onProgress?: (event: ProgressEvent) => void;
}

export interface ExecutionResult {
  success: boolean;
  taskId: string;
  leadId: string;
  output?: Record<string, any>;
  error?: string;
  durationMs: number;
}
