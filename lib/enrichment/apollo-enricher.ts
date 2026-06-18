import type { Contact, Lead } from "@/lib/types";
import type { EnrichmentProvider } from "./provider";
import type { AccountEnrichmentResult, ContactEnrichmentResult } from "./types";
import { claudeAccountFallback } from "./claude-enricher";

export const apolloEnricher: EnrichmentProvider = {
  name: "apollo",

  async enrichAccount(lead: Lead): Promise<AccountEnrichmentResult> {
    return claudeAccountFallback(lead);
  },

  async enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult> {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) throw new Error("APOLLO_API_KEY not configured");

    const nameParts = (contact.name || "").trim().split(/\s+/);
    const body: Record<string, string> = {
      organization_name: lead.company,
    };
    if (nameParts[0]) body.first_name = nameParts[0];
    if (nameParts.length > 1) body.last_name = nameParts.slice(1).join(" ");
    if (contact.title) body.title = contact.title;
    if (lead.website) body.domain = lead.website.replace(/^https?:\/\//, "").split("/")[0];
    if (contact.linkedinUrl) body.linkedin_url = contact.linkedinUrl;

    const res = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Apollo ${res.status}`);

    const data = (await res.json()) as {
      person?: {
        email?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
        name?: string;
        title?: string;
        linkedin_url?: string;
      };
    };

    const person = data.person;
    if (!person?.email) throw new Error("Apollo: no email found");

    return {
      name: person.name || contact.name,
      title: person.title || contact.title,
      email: person.email,
      phone: person.phone_numbers?.[0]?.sanitized_number || contact.phone,
      linkedinUrl: person.linkedin_url || contact.linkedinUrl,
      emailConfidence: "high",
      aiSummary: "E-mail via Apollo.",
      enrichmentProvider: "apollo",
    };
  },
};
