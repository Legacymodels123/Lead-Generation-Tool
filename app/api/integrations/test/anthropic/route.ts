import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { workspaceId: string };
    const { workspaceId } = body;

    if (!workspaceId) {
      return Response.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    // Fetch workspace config
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("config")
      .eq("id", workspaceId)
      .single();

    if (error) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    const apiKey = workspace?.config?.apiKeys?.anthropic;
    if (!apiKey) {
      return Response.json({ error: "Anthropic API key not configured" }, { status: 400 });
    }

    // Test the Anthropic API key
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
      const data = await response.json() as { error?: { message?: string } };
      return Response.json(
        {
          success: false,
          error: data.error?.message || "Anthropic API error - key might be invalid",
          status: response.status,
        },
        { status: 400 }
      );
    }

    const data = await response.json() as { content?: Array<{ text?: string }> };

    return Response.json({
      success: true,
      provider: "anthropic",
      message: data.content?.[0]?.text || "Verbonden met Claude",
      configured: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: errorMsg,
        hint: "Controleer je Anthropic API key op https://console.anthropic.com",
      },
      { status: 400 }
    );
  }
}
