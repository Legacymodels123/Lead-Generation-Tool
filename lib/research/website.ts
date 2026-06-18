import { callAi } from "@/lib/automation/provider";
import type { Lead } from "@/lib/types";

export interface WebsiteResearchResult {
  summary: string;
  industry?: string;
  products?: string;
  signals?: string;
  techStack?: string;
}

async function fetchPageContent(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (res.ok) {
      const data = await res.json();
      const markdown = data?.data?.markdown ?? data?.markdown;
      if (markdown) return String(markdown).slice(0, 12000);
    }
  }

  const jinaUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(jinaUrl, {
    headers: { Accept: "text/plain" },
  });
  if (res.ok) {
    return (await res.text()).slice(0, 12000);
  }

  throw new Error("Could not fetch website content");
}

function buildLeadContext(lead: Lead): string {
  return [
    `Company: ${lead.company}`,
    `Website: ${lead.website}`,
    `Country: ${lead.country}`,
    `Market: ${lead.market}`,
    `Sector: ${lead.sector}`,
    `Employees: ${lead.employees}`,
  ].join("\n");
}

export async function researchWebsite(
  lead: Lead,
  websiteUrl?: string,
  customPrompt?: string
): Promise<WebsiteResearchResult> {
  const url = websiteUrl || lead.website;
  if (!url) throw new Error("No website URL available");

  const pageContent = await fetchPageContent(url.startsWith("http") ? url : `https://${url}`);

  const system =
    "You are a B2B sales researcher. Analyze company website content and return ONLY valid JSON, no markdown.";

  const user = `${customPrompt || "Research this company for sales outreach."}

${buildLeadContext(lead)}

Website content:
${pageContent}

Return JSON:
{
  "summary": "2-3 sentence company summary",
  "industry": "primary industry",
  "products": "main products/services",
  "signals": "recent signals or growth indicators",
  "techStack": "detected technologies if any"
}`;

  const text = await callAi(system, user, 800);
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as WebsiteResearchResult;
}

export function formatResearchResult(result: WebsiteResearchResult): string {
  return [
    result.summary,
    result.industry ? `Industry: ${result.industry}` : "",
    result.products ? `Products: ${result.products}` : "",
    result.signals ? `Signals: ${result.signals}` : "",
    result.techStack ? `Tech: ${result.techStack}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
