import { buildPrompt } from "./prompts";
import { callAi } from "./provider";
import type { AiColumnKey } from "@/lib/types/automation";
import type { Lead } from "@/lib/types";

export async function generateAiColumn(
  column: AiColumnKey,
  lead: Lead
): Promise<string> {
  const { system, user } = buildPrompt(column, lead);
  return callAi(system, user, 512);
}
