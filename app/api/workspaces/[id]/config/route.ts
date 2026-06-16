import { createClient } from "@supabase/supabase-js";
import type { WorkspaceConfig } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/workspaces/[id]/config
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("config")
      .eq("id", params.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    return Response.json(data.config || {});
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/config
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as WorkspaceConfig;

    // Validate config structure
    if (body.apiKeys) {
      const { openai, hubspot, lusha } = body.apiKeys;
      if (openai && typeof openai !== "string") {
        return Response.json(
          { error: "Invalid OpenAI key format" },
          { status: 400 }
        );
      }
      if (hubspot && typeof hubspot !== "string") {
        return Response.json(
          { error: "Invalid HubSpot token format" },
          { status: 400 }
        );
      }
      if (lusha && typeof lusha !== "string") {
        return Response.json(
          { error: "Invalid Lusha key format" },
          { status: 400 }
        );
      }
    }

    // Merge with existing config (preserve fields not in request)
    const { data: existing } = await supabase
      .from("workspaces")
      .select("config")
      .eq("id", params.id)
      .single();

    const currentConfig = existing?.config || {};
    const mergedConfig = {
      ...currentConfig,
      ...body,
      apiKeys: {
        ...(currentConfig.apiKeys || {}),
        ...(body.apiKeys || {}),
      },
    };

    const { data, error } = await supabase
      .from("workspaces")
      .update({ config: mergedConfig })
      .eq("id", params.id)
      .select("config")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(data?.config || {});
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
