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

    const apiKey = workspace?.config?.apiKeys?.hubspot;
    if (!apiKey) {
      return Response.json({ error: "HubSpot token not configured" }, { status: 400 });
    }

    // Test the HubSpot API key by fetching account info
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/companies?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json() as { message?: string };
      return Response.json(
        {
          success: false,
          error: data.message || "HubSpot API error - token might be invalid",
          status: response.status,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      provider: "hubspot",
      message: "Verbonden met HubSpot",
      configured: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: errorMsg,
        hint: "Controleer je HubSpot Private App token op https://app.hubspot.com/settings/apps",
      },
      { status: 400 }
    );
  }
}
