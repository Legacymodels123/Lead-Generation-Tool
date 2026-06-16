import { callAi } from "@/lib/automation/provider";
import { getDmuRoleLabel } from "@/lib/dmu/roles";
import { getIcpForWorkspace } from "@/lib/workspace/context";
import type { Contact, Lead } from "@/lib/types";
import type { EnrichmentProvider } from "./provider";
import type { AccountEnrichmentResult, ContactEnrichmentResult } from "./types";

const SYSTEM =
  "Je bent een B2B researcher voor Legacy Scale Models (premium schaalmodellen voor tractors, bussen, trucks). Antwoord alleen met geldige JSON, geen markdown.";

export const claudeEnricher: EnrichmentProvider = {
  name: "claude",

  async enrichAccount(lead: Lead): Promise<AccountEnrichmentResult> {
    const icp = getIcpForWorkspace(lead.workspaceId);
    const markets = icp.markets.map((m) => m.label).join(", ");

    const user = `Analyseer dit bedrijf voor sales outreach.
Bedrijf: "${lead.company}"
Land: ${lead.country || "onbekend"}
Sector: ${lead.sector || "onbekend"}
Medewerkers: ${lead.employees || 0}
Website: ${lead.website || "onbekend"}

ICP markten: ${markets}
${icp.companyDescription}

Return ONLY JSON:
{
  "market": string (één van: ${markets}),
  "sector": string,
  "fitReason": string (2-3 zinnen waarom fit voor schaalmodellen),
  "employees": number,
  "revenue": string,
  "country": string,
  "website": string,
  "linkedinCompanyUrl": string,
  "aiSummary": string,
  "suggestedContacts": [
    { "dmuRole": "marketing_brand", "name": string, "title": string, "linkedinUrl": string },
    { "dmuRole": "ceo_owner", "name": string, "title": string, "linkedinUrl": string }
  ]
}`;

    const text = await callAi(SYSTEM, user, 1024);
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as AccountEnrichmentResult;
  },

  async enrichContact(contact: Contact, lead: Lead): Promise<ContactEnrichmentResult> {
    const roleLabel = getDmuRoleLabel(contact.dmuRole);
    const user = `Zoek contactgegevens voor outreach naar ${lead.company}.
DMU rol: ${roleLabel}
Huidige naam: ${contact.name || "onbekend"}
Huidige functie: ${contact.title || "onbekend"}
LinkedIn: ${contact.linkedinUrl || "onbekend"}
Land: ${lead.country}

Return ONLY JSON:
{
  "name": string,
  "title": string,
  "email": string (professioneel e-mailadres of leeg als onbekend),
  "phone": string (internationaal formaat of leeg),
  "linkedinUrl": string,
  "emailConfidence": "low" | "medium" | "high",
  "aiSummary": string (1 zin)
}

emailConfidence: "high" alleen bij hoge zekerheid, anders "low" of "medium".`;

    const text = await callAi(SYSTEM, user, 512);
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as ContactEnrichmentResult;
  },
};

export function claudeAccountFallback(lead: Lead): AccountEnrichmentResult {
  const icp = getIcpForWorkspace(lead.workspaceId);
  const sector =
    lead.sector ||
    (lead.company.toLowerCase().includes("bus")
      ? "Bus Operator"
      : lead.company.toLowerCase().includes("truck")
        ? "Truck Operator"
        : "Agri Dealer");
  const market =
    icp.markets.find((m) => m.sectorTags.includes(sector))?.label ?? "Agri Machinery";

  return {
    market,
    sector,
    fitReason: `${lead.company} opereert in ${market}. Legacy Scale Models kan co-branded schaalmodellen leveren voor showrooms, events en klantengeschenken.`,
    employees: lead.employees || 150,
    revenue: lead.revenue || "€15M",
    country: lead.country || "Nederland",
    website: lead.website || "",
    linkedinCompanyUrl: lead.linkedinCompanyUrl || "",
    aiSummary: `Potentiële fit in ${market} — schaalmodellen voor branding en gifting.`,
    suggestedContacts: [
      {
        dmuRole: "marketing_brand",
        name: lead.contactName || "Marketing Manager",
        title: lead.contactTitle || "Head of Marketing",
        linkedinUrl: lead.linkedinUrl || "",
      },
      {
        dmuRole: "ceo_owner",
        name: "",
        title: "CEO / Managing Director",
        linkedinUrl: "",
      },
    ],
  };
}

export function claudeContactFallback(contact: Contact, lead: Lead): ContactEnrichmentResult {
  return {
    name: contact.name || (contact.dmuRole === "ceo_owner" ? "Managing Director" : "Marketing Manager"),
    title: contact.title || (contact.dmuRole === "ceo_owner" ? "CEO" : "Marketing Manager"),
    email: contact.email || "",
    phone: contact.phone || "",
    linkedinUrl: contact.linkedinUrl || "",
    emailConfidence: "low",
    aiSummary: `Geschat contact bij ${lead.company} (geen AI-provider actief).`,
  };
}
