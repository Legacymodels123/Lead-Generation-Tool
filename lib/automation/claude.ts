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

export async function generateCustomAiValue(prompt: string, lead: Lead): Promise<string> {
  const system =
    "You generate concise spreadsheet cell values for B2B lead research. Reply with plain text only, no markdown.";
  const user = `${prompt}\n\nCompany: ${lead.company}\nMarket: ${lead.market}\nFit: ${lead.fitReason}\nWebsite: ${lead.website}`;
  return callAi(system, user, 512);
}
