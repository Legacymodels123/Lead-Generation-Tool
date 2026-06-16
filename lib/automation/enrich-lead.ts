import { callAi } from "./provider";
import type { Lead } from "@/lib/types";

export interface EnrichmentResult {
  sector: string;
  employees: number;
  revenue: string;
  contactName: string;
  contactTitle: string;
  country: string;
  outreachAngle: string;
  aiSummary: string;
}

const SYSTEM =
  "Je bent een B2B researcher voor Legacy Scale Models (schaalmodellen agri/mobility). Schat ontbrekende data realistisch in op basis van publieke kennis. Label duidelijk dat dit AI-gegenereerde schattingen zijn. Antwoord alleen met geldige JSON, geen markdown.";

export async function enrichLeadWithAi(lead: Lead): Promise<EnrichmentResult> {
  const user = `Verrijk deze lead voor sales outreach. Bedrijf: "${lead.company}".
Huidige data: land=${lead.country || "onbekend"}, sector=${lead.sector || "onbekend"}, medewerkers=${lead.employees || 0}.

Return ONLY JSON:
{
  "sector": string,
  "employees": number,
  "revenue": string,
  "contactName": string,
  "contactTitle": string,
  "country": string,
  "outreachAngle": string,
  "aiSummary": string
}

aiSummary: 2 zinnen waarom relevant voor schaalmodellen/partnergeschenken.`;

  const text = await callAi(SYSTEM, user, 768);
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as EnrichmentResult;
}

export function enrichLeadFallback(lead: Lead): EnrichmentResult {
  const sector =
    lead.sector ||
    (lead.company.toLowerCase().includes("farm")
      ? "Agri Machinery"
      : "Agri Dealer");
  return {
    sector,
    employees: lead.employees || 150,
    revenue: lead.revenue || "€15M",
    contactName: lead.contactName || "Marketing Manager",
    contactTitle: lead.contactTitle || "Head of Marketing",
    country: lead.country || "Nederland",
    outreachAngle: `Potentiële fit voor co-branded schaalmodellen in ${sector}`,
    aiSummary: `${lead.company} opereert in ${sector}. Legacy Scale Models kan schaalmodellen leveren voor showrooms en events. (Geschat — geen AI-provider actief)`,
  };
}
