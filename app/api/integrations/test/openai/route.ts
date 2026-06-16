import { createClient } from "@supabase/supabase-js";
import { callOpenAI } from "@/lib/automation/openai";

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

    const apiKey = workspace?.config?.apiKeys?.openai;
    if (!apiKey) {
      return Response.json({ error: "OpenAI API key not configured" }, { status: 400 });
    }

    // Test the API key
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
        hint: "Controleer je API key en zorg dat deze actief is op openai.com",
      },
      { status: 400 }
    );
  }
}
