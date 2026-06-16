import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/automation/provider";
import { isHubSpotConfigured } from "@/lib/hubspot/client";
import { WORKSPACES } from "@/lib/workspace/context";

export async function GET() {
  const { provider, openaiConfigured, anthropicConfigured } = getAiConfig();

  return NextResponse.json({
    cloud: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    ai: openaiConfigured || anthropicConfigured,
    openai: openaiConfigured,
    anthropic: anthropicConfigured,
    aiProvider: provider,
    supabasePublic: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hubspot: isHubSpotConfigured(),
    supabaseAuth: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    workspaces: WORKSPACES.length,
  });
}
