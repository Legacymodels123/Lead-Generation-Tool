import type { AiColumnKey } from "@/lib/types/automation";
import type { Lead } from "@/lib/types";

function leadContext(lead: Lead): string {
  return [
    `Bedrijf: ${lead.company}`,
    `Land: ${lead.country}`,
    `Sector: ${lead.sector}`,
    `Medewerkers: ${lead.employees}`,
    lead.revenue ? `Omzet: ${lead.revenue}` : null,
    lead.contactName ? `Contact: ${lead.contactName}` : null,
    lead.contactTitle ? `Functie: ${lead.contactTitle}` : null,
    lead.status ? `Status: ${lead.status}` : null,
    lead.notes ? `Notities: ${lead.notes}` : null,
    lead.message ? `Bestaand bericht: ${lead.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM =
  "Je bent een sales-assistent voor Legacy Scale Models, een Nederlands bedrijf dat op maat gemaakte schaalmodellen levert (Universal Hobbies, Weise Toys) voor showrooms, beurzen en klantengeschenken in de agri/mobility sector. Schrijf professioneel, warm en beknopt in het Nederlands. Geen markdown, geen opsommingstekens tenzij expliciet gevraagd.";

export function buildPrompt(column: AiColumnKey, lead: Lead): { system: string; user: string } {
  const ctx = leadContext(lead);

  switch (column) {
    case "aiMessage":
      return {
        system: SYSTEM,
        user: `Schrijf een kort, gepersonaliseerd LinkedIn- of e-mailbericht (max 120 woorden) voor outreach naar deze lead. Noem Legacy Scale Models en de waarde van schaalmodellen voor hun sector.\n\n${ctx}`,
      };
    case "aiSummary":
      return {
        system: SYSTEM,
        user: `Geef een korte samenvatting (2-3 zinnen) van deze lead: waarom relevant voor Legacy Scale Models, en wat de kans op interesse is.\n\n${ctx}`,
      };
    case "aiNextStep":
      return {
        system: SYSTEM,
        user: `Stel één concrete vervolgstap voor (1 zin) voor deze lead in de sales pipeline.\n\n${ctx}`,
      };
  }
}
