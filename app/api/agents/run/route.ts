import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/agents/engine';
import { AgentConfig } from '@/lib/agents/types';
import { getSessionUser } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

interface RunAgentRequest {
  agentId: string;
  agentType: string;
  leadIds: string[];
  config: AgentConfig;
}

/**
 * POST /api/agents/run
 * Execute an agent on leads
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RunAgentRequest = await request.json();

    if (!body.agentId || !body.leadIds || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, leadIds, config' },
        { status: 400 }
      );
    }

    if (body.leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds must contain at least one ID' },
        { status: 400 }
      );
    }

    // Execute agent
    const run = await AgentEngine.executeAgent({
      runId: `run-${Date.now()}`,
      agentId: body.agentId,
      agentConfig: body.config,
      workspaceId: user.workspaceId || 'default',
      userId: user.id,
      leadIds: body.leadIds,
    });

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        agentId: run.agentId,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        totalItems: run.totalItems,
        processedItems: run.processedItems,
        failedItems: run.failedItems,
        result: run.result,
        error: run.error,
      },
    });
  } catch (error) {
    console.error('Run agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
