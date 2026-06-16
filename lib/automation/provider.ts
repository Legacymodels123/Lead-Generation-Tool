import { callClaude } from "./claude-client";
import { callOpenAI } from "./openai";

export type AiProvider = "openai" | "anthropic";

export interface AiConfig {
  provider: AiProvider | null;
  apiKey: string | null;
  openaiConfigured: boolean;
  anthropicConfigured: boolean;
}

export function getAiConfig(): AiConfig {
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

export async function callAi(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string> {
  const { provider, apiKey } = getAiConfig();
  if (!provider || !apiKey) {
    throw new Error("Geen AI provider geconfigureerd");
  }
  if (provider === "openai") {
    return callOpenAI(apiKey, system, user, maxTokens);
  }
  return callClaude(apiKey, system, user, maxTokens);
}

export { parseJsonArray } from "./claude-client";
