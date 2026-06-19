import { getWorkspaceConfigForApi } from "@/lib/server/workspace-config-api";
import { callClaude } from "./claude-client";
import { callOpenAI } from "./openai";
import { getWorkspaceAiId } from "./ai-context";

export type AiProvider = "openai" | "anthropic";

export interface AiConfig {
  provider: AiProvider | null;
  apiKey: string | null;
  openaiConfigured: boolean;
  anthropicConfigured: boolean;
}

function configFromEnv(): AiConfig {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  if (openaiConfigured) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY!,
      openaiConfigured: true,
      anthropicConfigured,
    };
  }
  if (anthropicConfigured) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY!,
      openaiConfigured: false,
      anthropicConfigured: true,
    };
  }
  return {
    provider: null,
    apiKey: null,
    openaiConfigured: false,
    anthropicConfigured: false,
  };
}

/** Env-only AI config (sync). Prefer getAiConfigAsync when a workspace id is available. */
export function getAiConfig(): AiConfig {
  return configFromEnv();
}

export async function getAiConfigAsync(workspaceId?: string): Promise<AiConfig> {
  const wsId = workspaceId ?? getWorkspaceAiId();
  if (wsId) {
    const wsConfig = await getWorkspaceConfigForApi(wsId);
    const openaiKey = wsConfig.apiKeys?.openai?.trim();
    const anthropicKey = wsConfig.apiKeys?.anthropic?.trim();

    if (openaiKey) {
      return {
        provider: "openai",
        apiKey: openaiKey,
        openaiConfigured: true,
        anthropicConfigured: Boolean(anthropicKey || process.env.ANTHROPIC_API_KEY),
      };
    }
    if (anthropicKey) {
      return {
        provider: "anthropic",
        apiKey: anthropicKey,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        anthropicConfigured: true,
      };
    }
  }

  return configFromEnv();
}

export async function callAi(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string> {
  const { provider, apiKey } = await getAiConfigAsync();
  if (!provider || !apiKey) {
    throw new Error(
      "Geen AI provider geconfigureerd. Voeg een OpenAI- of Anthropic-sleutel toe onder Integrations."
    );
  }
  if (provider === "openai") {
    return callOpenAI(apiKey, system, user, maxTokens);
  }
  return callClaude(apiKey, system, user, maxTokens);
}

export { parseJsonArray } from "./claude-client";
