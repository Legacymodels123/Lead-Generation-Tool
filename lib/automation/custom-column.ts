import { callAi } from "./provider";
import type { Lead } from "@/lib/types";

function buildLeadContext(lead: Lead): string {
  return JSON.stringify(
    {
      company: lead.company,
      country: lead.country,
      market: lead.market,
      sector: lead.sector,
      employees: lead.employees,
      website: lead.website,
      fitReason: lead.fitReason,
      score: lead.score,
      contacts: lead.contacts.map((c) => ({
        name: c.name,
        title: c.title,
        email: c.email,
      })),
    },
    null,
    2
  );
}

export async function generateCustomAiColumn(lead: Lead, prompt: string): Promise<string> {
  const system =
    "You are a B2B sales assistant. Follow the user instruction using the lead data. Reply with plain text only, no JSON unless asked.";

  const user = `${prompt}

Lead data:
${buildLeadContext(lead)}`;

  return callAi(system, user, 512);
}
