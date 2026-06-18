import type { Contact, Lead } from "@/lib/types";
import type { EnrichmentProvider } from "./provider";
import type { AccountEnrichmentResult, ContactEnrichmentResult } from "./types";
import { claudeAccountFallback, claudeContactFallback } from "./claude-enricher";

function domainFromLead(lead: Lead): string {
  if (lead.website) {
    try {
      const url = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  const slug = lead.company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  return slug ? `${slug}.com` : "";
}

export const hunterEnricher: EnrichmentProvider = {
  name: "hunter",

  async enrichAccount(lead: Lead): Promise<AccountEnrichmentResult> {
    return claudeAccountFallback(lead);
  },

  async enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult> {
    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) throw new Error("HUNTER_API_KEY not configured");

    const domain = domainFromLead(lead);
    if (!domain) throw new Error("No domain for Hunter lookup");

    const params = new URLSearchParams({
      domain,
      api_key: apiKey,
      limit: "10",
    });
    if (contact.name) {
      const parts = contact.name.trim().split(/\s+/);
      if (parts[0]) params.set("first_name", parts[0]);
      if (parts.length > 1) params.set("last_name", parts.slice(1).join(" "));
    }

    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
    if (!res.ok) throw new Error(`Hunter ${res.status}`);

    const data = (await res.json()) as {
      data?: {
        emails?: Array<{
          value: string;
          type: string;
          confidence: number;
          first_name?: string;
          last_name?: string;
          position?: string;
        }>;
      };
    };

    const emails = data.data?.emails ?? [];
    const match =
      emails.find((e) => {
        if (!contact.name) return e.type === "personal" || e.type === "generic";
        const fn = contact.name.split(" ")[0]?.toLowerCase();
        return e.first_name?.toLowerCase() === fn;
      }) ?? emails[0];

    if (!match?.value) throw new Error("Hunter: no email found");

    const confidence =
      match.confidence >= 80 ? "high" : match.confidence >= 50 ? "medium" : "low";

    return {
      name: contact.name || [match.first_name, match.last_name].filter(Boolean).join(" "),
      title: contact.title || match.position || "",
      email: match.value,
      phone: contact.phone,
      linkedinUrl: contact.linkedinUrl,
      emailConfidence: confidence as Contact["emailConfidence"],
      aiSummary: `E-mail via Hunter (${confidence} confidence).`,
      enrichmentProvider: "hunter",
    };
  },
};
