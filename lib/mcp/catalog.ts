import type { McpConnection } from "@/lib/types";

export type McpCatalogCategory = "crm" | "social" | "data" | "communication" | "research" | "custom";

export interface McpToolPreset {
  id: string;
  name: string;
  tagline: string;
  category: McpCatalogCategory;
  glyph: string;
  accent: string;
  /** Suggested MCP endpoint — user replaces host or uses their deployment */
  defaultUrl: string;
  authType: McpConnection["authType"];
  docsUrl?: string;
  setupHint: string;
}

export const MCP_CATEGORY_LABELS: Record<McpCatalogCategory, string> = {
  crm: "CRM & sales",
  social: "Social & outreach",
  data: "Data & storage",
  communication: "Communication",
  research: "Research",
  custom: "Custom",
};

export const MCP_TOOL_CATALOG: McpToolPreset[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    tagline: "Companies, contacts & deals",
    category: "crm",
    glyph: "⬡",
    accent: "mcp-hubspot",
    defaultUrl: "https://your-mcp-host.example/hubspot/mcp",
    authType: "bearer",
    docsUrl: "https://developers.hubspot.com/docs/api/overview",
    setupHint: "Deploy a HubSpot MCP server or paste your hosted MCP URL. Use a private app or OAuth token as bearer.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    tagline: "Profiles & company lookup",
    category: "social",
    glyph: "in",
    accent: "mcp-linkedin",
    defaultUrl: "https://your-mcp-host.example/linkedin/mcp",
    authType: "bearer",
    setupHint: "Connect a LinkedIn-capable MCP bridge (Sales Navigator export, profile enrichment, etc.).",
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Notify channels on lead events",
    category: "communication",
    glyph: "#",
    accent: "mcp-slack",
    defaultUrl: "https://your-mcp-host.example/slack/mcp",
    authType: "bearer",
    docsUrl: "https://api.slack.com/messaging/webhooks",
    setupHint: "Use an MCP server with Slack tools, or a bot token as bearer auth.",
  },
  {
    id: "notion",
    name: "Notion",
    tagline: "Sync notes & playbooks",
    category: "data",
    glyph: "N",
    accent: "mcp-notion",
    defaultUrl: "https://your-mcp-host.example/notion/mcp",
    authType: "bearer",
    docsUrl: "https://developers.notion.com/",
    setupHint: "Paste your Notion integration MCP endpoint and integration token.",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    tagline: "Import & export spreadsheets",
    category: "data",
    glyph: "▦",
    accent: "mcp-sheets",
    defaultUrl: "https://your-mcp-host.example/google-sheets/mcp",
    authType: "bearer",
    setupHint: "Connect a Google Sheets MCP server with service account or OAuth bearer token.",
  },
  {
    id: "supabase",
    name: "Supabase",
    tagline: "Query leads database",
    category: "data",
    glyph: "⚡",
    accent: "mcp-supabase",
    defaultUrl: "https://your-mcp-host.example/supabase/mcp",
    authType: "bearer",
    docsUrl: "https://supabase.com/docs",
    setupHint: "Use a Supabase MCP server pointed at your project. Service role key as bearer (keep private).",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    tagline: "Website research & scrape",
    category: "research",
    glyph: "◎",
    accent: "mcp-firecrawl",
    defaultUrl: "https://mcp.firecrawl.dev/mcp",
    authType: "bearer",
    docsUrl: "https://docs.firecrawl.dev/",
    setupHint: "Official Firecrawl MCP — paste your Firecrawl API key as bearer token.",
  },
  {
    id: "apollo",
    name: "Apollo",
    tagline: "B2B contact enrichment",
    category: "research",
    glyph: "A",
    accent: "mcp-apollo",
    defaultUrl: "https://your-mcp-host.example/apollo/mcp",
    authType: "bearer",
    setupHint: "Apollo enrichment via MCP — API key as bearer.",
  },
  {
    id: "custom",
    name: "Custom MCP",
    tagline: "Any JSON-RPC MCP server",
    category: "custom",
    glyph: "+",
    accent: "mcp-custom",
    defaultUrl: "http://localhost:3001/mcp",
    authType: "none",
    setupHint: "Paste any MCP HTTP endpoint (streamable HTTP or JSON-RPC POST).",
  },
];

export function getMcpPreset(id: string): McpToolPreset | undefined {
  return MCP_TOOL_CATALOG.find((p) => p.id === id);
}

export function presetToDraft(preset: McpToolPreset): Partial<McpConnection> {
  return {
    name: preset.name,
    url: preset.defaultUrl,
    authType: preset.authType,
    catalogId: preset.id,
    category: preset.category,
    description: preset.tagline,
    enabled: true,
  };
}
