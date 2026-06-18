export interface InstantlyLeadInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  personalization?: string;
}

export async function addLeadsToInstantlyCampaign(
  apiKey: string,
  campaignId: string,
  leads: InstantlyLeadInput[]
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  let added = 0;

  for (const lead of leads) {
    if (!lead.email) continue;
    try {
      const res = await fetch("https://api.instantly.ai/api/v1/lead/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          email: lead.email,
          first_name: lead.first_name ?? "",
          last_name: lead.last_name ?? "",
          company_name: lead.company_name ?? "",
          personalization: lead.personalization ?? "",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        errors.push(`${lead.email}: ${text.slice(0, 120)}`);
      } else {
        added++;
      }
    } catch (e) {
      errors.push(`${lead.email}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return { added, errors };
}

export function isInstantlyConfigured(): boolean {
  return Boolean(process.env.INSTANTLY_API_KEY);
}
