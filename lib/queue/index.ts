// Job Queue System for agent execution
// Uses in-memory storage with periodic processing
// TODO: Migrate to Supabase for persistence

export type JobType = 'agent_run' | 'scheduled_task' | 'webhook';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  workspaceId: string;
  userId: string;
  payload: Record<string, any>;
  status: JobStatus;
  retries: number;
  maxRetries: number;
  error?: string;
  result?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  nextRetryAt?: Date;
}

class JobQueue {
  private jobs = new Map<string, Job>();
  private processingJobs = new Set<string>();
  private workerRunning = false;
  private jobHandlers = new Map<JobType, (job: Job) => Promise<any>>();

  constructor() {
    this.registerDefaultHandlers();
    this.startWorker();
  }

  /**
   * Enqueue a job
   */
  enqueue(type: JobType, workspaceId: string, userId: string, payload: Record<string, any>): string {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type,
      workspaceId,
      userId,
      payload,
      status: 'queued',
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Register a handler for a job type
   */
  registerHandler(type: JobType, handler: (job: Job) => Promise<any>): void {
    this.jobHandlers.set(type, handler);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a workspace
   */
  getWorkspaceJobs(workspaceId: string, status?: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(
      job => job.workspaceId === workspaceId && (!status || job.status === status)
    );
  }

  /**
   * Start background worker to process jobs
   */
  private startWorker(): void {
    if (this.workerRunning) return;
    this.workerRunning = true;

    const processJobs = async () => {
      try {
        const queuedJobs = Array.from(this.jobs.values()).filter(
          job => job.status === 'queued' && !this.processingJobs.has(job.id)
        );

        for (const job of queuedJobs.slice(0, 5)) {
          // Process max 5 jobs per cycle
          await this.processJob(job);
        }
      } catch (error) {
        console.error('Job queue worker error:', error);
      }

      // Continue processing every 5 seconds
      setTimeout(processJobs, 5000);
    };

    processJobs();
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    if (this.processingJobs.has(job.id)) return;

    this.processingJobs.add(job.id);
    job.status = 'processing';

    try {
      const handler = this.jobHandlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      const result = await handler(job);

      job.status = 'completed';
      job.result = result;
      job.processedAt = new Date();
    } catch (error) {
      job.retries++;

      if (job.retries < job.maxRetries) {
        // Retry with exponential backoff
        const backoffMs = Math.pow(2, job.retries) * 1000;
        job.nextRetryAt = new Date(Date.now() + backoffMs);
        job.status = 'queued';
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.processedAt = new Date();
      }
    } finally {
      this.processingJobs.delete(job.id);
      this.jobs.set(job.id, job);
    }
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    this.registerHandler('agent_run', async (job) => {
      const { agentId, leadIds } = job.payload;
      // This will be called by the agent engine
      return { agentId, leadIds, processed: leadIds?.length || 0 };
    });

    this.registerHandler('scheduled_task', async (job) => {
      // Scheduled task execution
      return { scheduled: true };
    });

    this.registerHandler('webhook', async (job) => {
      const { url, data } = job.payload;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return { status: response.status, ok: response.ok };
    });
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

/**
 * Enqueue an agent run
 */
export function enqueueAgentRun(
  workspaceId: string,
  userId: string,
  agentId: string,
  leadIds: string[]
): string {
  return jobQueue.enqueue('agent_run', workspaceId, userId, {
    agentId,
    leadIds,
  });
}

/**
 * Enqueue a webhook
 */
export function enqueueWebhook(
  workspaceId: string,
  userId: string,
  url: string,
  data: Record<string, any>
): string {
  return jobQueue.enqueue('webhook', workspaceId, userId, {
    url,
    data,
  });
}
