import { createClient } from "@supabase/supabase-js";
import { callOpenAI } from "@/lib/automation/openai";

export const dynamic = "force-dynamic";

type Provider = "openai" | "anthropic" | "hubspot" | "lusha";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json() as {
      workspaceId: string;
      provider?: Provider;
    };

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

    const config = workspace?.config || {};

    return Response.json({
      success: true,
      workspace: workspaceId,
      configured: {
        openai: !!config.apiKeys?.openai,
        anthropic: !!config.apiKeys?.anthropic,
        hubspot: !!config.apiKeys?.hubspot,
        lusha: !!config.apiKeys?.lusha,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
