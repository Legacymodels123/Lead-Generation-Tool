import { getWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspaceId: string };
    const { workspaceId } = body;

    if (!workspaceId) {
      return Response.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const config = await getWorkspaceConfigForApi(workspaceId);
    const apiKey = config.apiKeys?.anthropic;
    if (!apiKey) {
      return Response.json({ error: "Anthropic API key not configured" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: "Say 'API key works!' in Dutch with one sentence.",
          },
        ],
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      return Response.json(
        {
          success: false,
          error: data.error?.message || "Anthropic API error - key might be invalid",
          status: response.status,
        },
        { status: 400 }
      );
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> };

    return Response.json({
      success: true,
      provider: "anthropic",
      message: data.content?.[0]?.text || "Connected to Claude",
      configured: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: errorMsg,
        hint: "Check your Anthropic API key at console.anthropic.com",
      },
      { status: 400 }
    );
  }
}
