import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/agents/engine';
import { getSessionUser } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/progress?runId=xxx
 * Server-sent events stream for agent execution progress
 */
export async function GET(request: NextRequest) {
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

    const runId = request.nextUrl.searchParams.get('runId');
    if (!runId) {
      return NextResponse.json(
        { error: 'Missing runId parameter' },
        { status: 400 }
      );
    }

    // Verify user has access to this run
    const run = AgentEngine.getRun(runId);
    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    if (run.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create SSE response
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream({
      start(c) {
        controller = c;

        // Send initial state
        const initialState = {
          type: 'initial',
          runId,
          status: run.status,
          progress: {
            completed: run.processedItems,
            total: run.totalItems,
          },
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialState)}\n\n`));

        // Subscribe to progress events
        const unsubscribe = AgentEngine.subscribeToProgress(runId, (event) => {
          const eventData = {
            ...event,
            timestamp: typeof event.timestamp === 'string'
              ? event.timestamp
              : event.timestamp.toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        });

        // Handle client disconnect
        const checkInterval = setInterval(() => {
          const run = AgentEngine.getRun(runId);
          if (run?.status === 'completed' || run?.status === 'failed' || run?.status === 'cancelled') {
            clearInterval(checkInterval);
            unsubscribe();
            controller.close();
          }
        }, 1000);
      },
      cancel() {
        // Client disconnected
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Progress stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
