import type { Contact, Lead } from "@/lib/types";
import type { EnrichmentProvider } from "./provider";
import type { AccountEnrichmentResult, ContactEnrichmentResult } from "./types";

/** Stub for Phase 2b — wire LUSHA_API_KEY when subscription is available */
export const lushaEnricher: EnrichmentProvider = {
  name: "lusha",

  async enrichAccount(lead: Lead): Promise<AccountEnrichmentResult> {
    const apiKey = process.env.LUSHA_API_KEY;
    if (!apiKey) throw new Error("LUSHA_API_KEY not configured");
    // Placeholder — implement when Lusha API access is granted
    throw new Error("Lusha account enrichment not yet implemented");
  },

  async enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult> {
    const apiKey = process.env.LUSHA_API_KEY;
    if (!apiKey) throw new Error("LUSHA_API_KEY not configured");
    throw new Error("Lusha contact enrichment not yet implemented");
  },
};
