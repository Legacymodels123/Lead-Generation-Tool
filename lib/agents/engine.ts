import { AgentRun, AgentTask, AgentExecutionContext, ProgressEvent, ExecutionResult, TaskStatus } from './types';

// In-memory store for agent runs and tasks (will be moved to Supabase)
const activeRuns = new Map<string, AgentRun>();
const activeTasks = new Map<string, AgentTask[]>();
const progressListeners = new Map<string, Set<(event: ProgressEvent) => void>>();

/**
 * Agent execution engine
 * Handles running agents, tracking progress, and managing task execution
 */
export class AgentEngine {
  /**
   * Execute an agent with the given context
   */
  static async executeAgent(context: AgentExecutionContext): Promise<AgentRun> {
    const runId = generateId();

    // Initialize run
    const run: AgentRun = {
      id: runId,
      agentId: context.agentId,
      workspaceId: context.workspaceId,
      userId: context.userId,
      status: 'running',
      startedAt: new Date(),
      totalItems: context.leadIds.length,
      processedItems: 0,
      failedItems: 0,
      createdAt: new Date(),
    };

    activeRuns.set(runId, run);
    activeTasks.set(runId, []);

    try {
      // Execute tasks in parallel with controlled concurrency
      const parallelTasks = context.agentConfig.parallelTasks || 5;
      const results: ExecutionResult[] = [];

      for (let i = 0; i < context.leadIds.length; i += parallelTasks) {
        const batch = context.leadIds.slice(i, i + parallelTasks);
        const batchResults = await Promise.allSettled(
          batch.map(leadId => this.executeTask(runId, context, leadId))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            if (result.value.success) {
              run.processedItems++;
            } else {
              run.failedItems++;
            }
          } else {
            run.failedItems++;
          }

          // Emit progress event
          this.emitProgress({
            type: 'task_complete',
            runId,
            progress: {
              completed: run.processedItems + run.failedItems,
              total: run.totalItems,
            },
            timestamp: new Date(),
          });
        }
      }

      // Mark run as completed
      run.status = 'completed';
      run.completedAt = new Date();
      run.result = { results };

      // Emit completion event
      this.emitProgress({
        type: 'run_complete',
        runId,
        progress: {
          completed: run.processedItems + run.failedItems,
          total: run.totalItems,
        },
        data: run.result,
        timestamp: new Date(),
      });

    } catch (error) {
      run.status = 'failed';
      run.completedAt = new Date();
      run.error = error instanceof Error ? error.message : 'Unknown error';

      this.emitProgress({
        type: 'run_complete',
        runId,
        progress: {
          completed: run.processedItems + run.failedItems,
          total: run.totalItems,
        },
        timestamp: new Date(),
      });
    }

    activeRuns.set(runId, run);
    return run;
  }

  /**
   * Execute a single task for a lead
   */
  private static async executeTask(
    runId: string,
    context: AgentExecutionContext,
    leadId: string
  ): Promise<ExecutionResult> {
    const taskId = generateId();
    const startTime = Date.now();

    const task: AgentTask = {
      id: taskId,
      runId,
      agentId: context.agentId,
      leadId,
      status: 'running',
      input: { leadId, config: context.agentConfig },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store task
    const tasks = activeTasks.get(runId) || [];
    tasks.push(task);
    activeTasks.set(runId, tasks);

    try {
      // Execute based on provider type
      const output = await this.executeByProvider(context.agentConfig.provider, leadId, context.agentConfig);

      task.status = 'completed';
      task.output = output;

      this.emitProgress({
        type: 'task_complete',
        runId,
        taskId,
        leadId,
        progress: { completed: 0, total: 0 },
        data: output,
        timestamp: new Date(),
      });

      return {
        success: true,
        taskId,
        leadId,
        output,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';

      this.emitProgress({
        type: 'task_error',
        runId,
        taskId,
        leadId,
        progress: { completed: 0, total: 0 },
        data: { error: task.error },
        timestamp: new Date(),
      });

      return {
        success: false,
        taskId,
        leadId,
        error: task.error,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute task based on provider type
   */
  private static async executeByProvider(
    provider: string,
    leadId: string,
    config: any
  ): Promise<Record<string, any>> {
    // This will call the actual API endpoints
    const response = await fetch('/api/leads/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, config }),
    });

    if (!response.ok) {
      throw new Error(`Provider ${provider} failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Subscribe to progress events for a run
   */
  static subscribeToProgress(
    runId: string,
    callback: (event: ProgressEvent) => void
  ): () => void {
    if (!progressListeners.has(runId)) {
      progressListeners.set(runId, new Set());
    }
    progressListeners.get(runId)!.add(callback);

    // Return unsubscribe function
    return () => {
      progressListeners.get(runId)?.delete(callback);
    };
  }

  /**
   * Emit progress event to all subscribers
   */
  private static emitProgress(event: ProgressEvent): void {
    const listeners = progressListeners.get(event.runId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * Get run status
   */
  static getRun(runId: string): AgentRun | undefined {
    return activeRuns.get(runId);
  }

  /**
   * Get run tasks
   */
  static getTasks(runId: string): AgentTask[] {
    return activeTasks.get(runId) || [];
  }

  /**
   * Cancel a run
   */
  static cancelRun(runId: string): void {
    const run = activeRuns.get(runId);
    if (run && (run.status === 'pending' || run.status === 'running')) {
      run.status = 'cancelled';
      run.completedAt = new Date();
      activeRuns.set(runId, run);

      this.emitProgress({
        type: 'run_complete',
        runId,
        progress: {
          completed: run.processedItems,
          total: run.totalItems,
        },
        timestamp: new Date(),
      });
    }
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
