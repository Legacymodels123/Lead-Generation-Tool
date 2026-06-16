import type { Contact } from "@/lib/types";

export interface AccountEnrichmentResult {
  market: string;
  sector: string;
  fitReason: string;
  employees: number;
  revenue: string;
  country: string;
  website: string;
  linkedinCompanyUrl: string;
  aiSummary: string;
  suggestedContacts: Array<{
    dmuRole: Contact["dmuRole"];
    name: string;
    title: string;
    linkedinUrl: string;
  }>;
}

export interface ContactEnrichmentResult {
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  emailConfidence: Contact["emailConfidence"];
  aiSummary: string;
}
