import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/automation/provider";
import { isHubSpotConfigured } from "@/lib/hubspot/client";
import { getSupabaseEnvStatus } from "@/lib/supabase/env";
import { WORKSPACES } from "@/lib/workspace/context";

export async function GET() {
  const { provider, openaiConfigured, anthropicConfigured } = getAiConfig();
  const supabase = getSupabaseEnvStatus();

  return NextResponse.json({
    cloud: supabase.cloud,
    ai: openaiConfigured || anthropicConfigured,
    openai: openaiConfigured,
    anthropic: anthropicConfigured,
    aiProvider: provider,
    supabasePublic: supabase.url,
    supabaseAnonKey: supabase.anonKey,
    supabaseServerKey: supabase.serverKey,
    missingEnv: supabase.missingEnv,
    hubspot: isHubSpotConfigured(),
    supabaseAuth: supabase.url && supabase.anonKey,
    workspaces: WORKSPACES.length,
  });
}
