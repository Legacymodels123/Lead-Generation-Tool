export type IntegrationMethod = "api_key" | "oauth" | "api_key_or_oauth";

export interface IntegrationDef {
  id: string;
  label: string;
  glyph: string;
  brand: string;
  section: "ai" | "crm" | "enrichment";
  method: IntegrationMethod;
  purpose: string;
  usedFor: string[];
}

export const INTEGRATION_SECTIONS = {
  ai: {
    title: "AI providers",
    step: "1",
    description:
      "Required for AI properties, lead enrichment, and automated outreach copy. Paste an API key from your provider dashboard.",
  },
  crm: {
    title: "CRM & social",
    step: "2",
    description:
      "Connect HubSpot and LinkedIn to sync companies and import contact data. Use OAuth when available, or paste an access token.",
  },
  enrichment: {
    title: "Enrichment & outreach",
    step: "3",
    description:
      "Optional APIs for finding emails, company data, and sending sequences. Only needed if you use those automations.",
  },
  mcp: {
    title: "MCP agent tools",
    step: "4",
    description:
      "Model Context Protocol servers let agents take actions in external tools (search CRM, scrape websites, update sheets). Separate from API keys above.",
  },
} as const;

export const CORE_INTEGRATIONS: IntegrationDef[] = [
  {
    id: "openai",
    label: "ChatGPT",
    glyph: "◆",
    brand: "integration-openai",
    section: "ai",
    method: "api_key",
    purpose: "OpenAI models for grid AI columns",
    usedFor: ["AI properties", "Lead enrichment", "Workflow automations"],
  },
  {
    id: "anthropic",
    label: "Claude",
    glyph: "✦",
    brand: "integration-anthropic",
    section: "ai",
    method: "api_key",
    purpose: "Anthropic models for research & copy",
    usedFor: ["AI properties", "Research columns", "Outreach messages"],
  },
  {
    id: "hubspot",
    label: "HubSpot",
    glyph: "⬡",
    brand: "integration-hubspot",
    section: "crm",
    method: "api_key_or_oauth",
    purpose: "CRM sync for companies & contacts",
    usedFor: ["HubSpot column sync", "Push qualified leads", "Deal pipeline"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    glyph: "in",
    brand: "integration-linkedin",
    section: "crm",
    method: "api_key_or_oauth",
    purpose: "Profile & company import",
    usedFor: ["CSV import enrichment", "Contact URLs", "Social outreach"],
  },
];

export const ENRICHMENT_INTEGRATIONS: IntegrationDef[] = [
  {
    id: "hunter",
    label: "Hunter",
    glyph: "◎",
    brand: "integration-hunter",
    section: "enrichment",
    method: "api_key",
    purpose: "Email finder & verification",
    usedFor: ["Contact email discovery", "Enrichment waterfall"],
  },
  {
    id: "apollo",
    label: "Apollo",
    glyph: "A",
    brand: "integration-apollo",
    section: "enrichment",
    method: "api_key",
    purpose: "B2B contact & company data",
    usedFor: ["Contact enrichment", "Firmographic data"],
  },
  {
    id: "instantly",
    label: "Instantly",
    glyph: "✉",
    brand: "integration-instantly",
    section: "enrichment",
    method: "api_key",
    purpose: "Cold email sequences",
    usedFor: ["Push leads to campaigns", "Outreach automation"],
  },
];

export function methodLabel(method: IntegrationMethod): string {
  switch (method) {
    case "api_key":
      return "API key";
    case "oauth":
      return "OAuth";
    case "api_key_or_oauth":
      return "OAuth or token";
  }
}
