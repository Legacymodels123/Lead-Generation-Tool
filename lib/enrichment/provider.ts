import type { Contact, Lead } from "@/lib/types";
import type { AccountEnrichmentResult, ContactEnrichmentResult } from "./types";

export interface EnrichmentProvider {
  name: string;
  enrichAccount(lead: Lead): Promise<AccountEnrichmentResult>;
  enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult>;
}

export interface EnrichmentWaterfall {
  enrichAccount(lead: Lead): Promise<AccountEnrichmentResult>;
  enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult>;
}

export function createWaterfall(providers: EnrichmentProvider[]): EnrichmentWaterfall {
  return {
    async enrichAccount(lead) {
      let last: AccountEnrichmentResult | null = null;
      for (const p of providers) {
        try {
          last = await p.enrichAccount(lead);
          if (last.market && last.fitReason) return last;
        } catch {
          continue;
        }
      }
      if (!last) throw new Error("All enrichment providers failed");
      return last;
    },
    async enrichContact(contact, lead) {
      let last: ContactEnrichmentResult | null = null;
      for (const p of providers) {
        try {
          last = await p.enrichContact(contact, lead);
          if (last.email && last.emailConfidence !== "low") return last;
        } catch {
          continue;
        }
      }
      if (!last) throw new Error("All contact enrichment providers failed");
      return last;
    },
  };
}
