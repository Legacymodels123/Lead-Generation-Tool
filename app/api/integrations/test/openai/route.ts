import { callOpenAI } from "@/lib/automation/openai";
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
    const apiKey = config.apiKeys?.openai;
    if (!apiKey) {
      return Response.json({ error: "OpenAI API key not configured" }, { status: 400 });
    }

    const response = await callOpenAI(
      apiKey,
      "You are a helpful assistant.",
      "Say 'API key works!' in Dutch.",
      100
    );

    if (!response) {
      return Response.json(
        { error: "No response from OpenAI - key might be invalid" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      provider: "openai",
      message: response,
      configured: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: errorMsg,
        hint: "Check your API key is active at platform.openai.com",
      },
      { status: 400 }
    );
  }
}
