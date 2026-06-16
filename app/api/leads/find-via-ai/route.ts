import { createClient } from "@supabase/supabase-js";
import { getAiConfig } from "@/lib/automation/provider";
import { callOpenAI } from "@/lib/automation/openai";
import { LEGACY_SCALE_MODELS_ICP } from "@/lib/icp/legacy-scale-models";
import type { Lead } from "@/lib/types";
import { generateId } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FindLeadsRequest {
  workspaceId: string;
  market?: string;
  sector?: string;
  companySize?: "small" | "medium" | "large";
  country?: string;
  fitCriteria?: string;
  count?: number;
}

interface GeneratedLead {
  company: string;
  website?: string;
  sector: string;
  market: string;
  country: string;
  employees?: number;
  revenue?: string;
  fitReason?: string;
}

function parseCompanySize(size: string): number {
  switch (size) {
    case "small":
      return 50;
    case "medium":
      return 250;
    case "large":
      return 1000;
    default:
      return 100;
  }
}

async function generateLeads(
  count: number,
  market: string,
  sector: string,
  companySize: number,
  country: string,
  fitCriteria: string,
  apiKey: string
): Promise<GeneratedLead[]> {
  const icp = LEGACY_SCALE_MODELS_ICP;

  const prompt = `Generate ${count} realistic B2B lead candidates for a sales outreach campaign.

Requirements:
- Market: ${market}
- Primary sector: ${sector}
- Company size: ~${companySize} employees
- Geography: ${country}
- ICP fit criteria: ${fitCriteria}
- Company quality: Real, operational companies that likely exist

Constraints:
- Only generate companies that are plausible and realistic
- Include a range of company sizes around the target (±20%)
- Ensure variety in sub-sectors within the primary sector
- All data must be realistic and factual in nature

Return ONLY a valid JSON array with no additional text. Each object must have exactly these fields (no extra fields):
{
  "company": "Company Name",
  "sector": "specific sector",
  "market": "${market}",
  "country": "${country}",
  "employees": number between ${companySize * 0.8} and ${companySize * 1.2},
  "fitReason": "brief explanation of why they fit the ICP"
}

Example response format:
[
  {"company": "Example Corp", "sector": "Technology", "market": "${market}", "country": "${country}", "employees": 150, "fitReason": "Growing tech company matching target profile"},
  {"company": "Sample Inc", "sector": "Manufacturing", "market": "${market}", "country": "${country}", "employees": 200, "fitReason": "Mid-size manufacturer with expansion plans"}
]

Now generate the leads:`;

  try {
    const response = await callOpenAI(
      apiKey,
      "You are a B2B lead research expert. Generate realistic company leads based on the provided criteria.",
      prompt,
      2000
    );

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const leads: GeneratedLead[] = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    return leads
      .filter(
        (l) =>
          l.company &&
          typeof l.company === "string" &&
          l.sector &&
          typeof l.sector === "string"
      )
      .slice(0, count)
      .map((l) => ({
        company: l.company.trim().slice(0, 100),
        sector: l.sector.trim().slice(0, 50),
        market: l.market || market,
        country: l.country || country,
        employees: Math.max(10, Math.min(10000, l.employees || companySize)),
        fitReason: (l.fitReason || "").trim().slice(0, 200),
        website: l.website ? l.website.trim().slice(0, 100) : "",
      }));
  } catch (err) {
    console.error("Error generating leads via AI:", err);
    throw new Error(
      "Failed to generate leads: " + (err instanceof Error ? err.message : "Unknown error")
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FindLeadsRequest;
    const {
      workspaceId,
      market = "Technology",
      sector = "Software",
      companySize = "medium",
      country = "Nederland",
      fitCriteria = "Growing companies with expansion potential",
      count = 5,
    } = body;

    if (!workspaceId) {
      return Response.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    if (count < 1 || count > 20) {
      return Response.json(
        { error: "Count must be between 1 and 20" },
        { status: 400 }
      );
    }

    // Get API key from workspace config
    const config = await supabase
      .from("workspaces")
      .select("config")
      .eq("id", workspaceId)
      .single();

    if (config.error) {
      return Response.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const apiKey =
      config.data?.config?.apiKeys?.openai || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "No AI API key configured for workspace" },
        { status: 400 }
      );
    }

    // Generate leads via AI
    const companySize_ = parseCompanySize(companySize);
    const generatedLeads = await generateLeads(
      count,
      market,
      sector,
      companySize_,
      country,
      fitCriteria,
      apiKey
    );

    // Get userId from headers (would come from auth middleware in production)
    const userId = "system";

    // Insert generated leads into database
    const leadsToInsert = generatedLeads.map((l) => ({
      id: generateId(),
      user_id: userId,
      workspace_id: workspaceId,
      company: l.company,
      sector: l.sector,
      market: l.market,
      country: l.country,
      employees: l.employees,
      fit_reason: l.fitReason,
      website: l.website || "",
      status: "not_qualified",
      batch: new Date().toISOString().slice(0, 10),
      is_new: true,
      source: "ai_generated",
      notes: `Generated via AI on ${new Date().toLocaleDateString("nl-NL")}`,
      message: "",
      contact_name: "",
      contact_title: "",
      linkedin_url: "",
      linkedin_company_url: "",
    }));

    const { data, error } = await supabase
      .from("leads")
      .insert(leadsToInsert)
      .select();

    if (error) {
      return Response.json(
        { error: "Failed to insert leads: " + error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      count: data?.length || 0,
      leads: data || [],
    });
  } catch (err) {
    console.error("Error in find-via-ai endpoint:", err);
    return Response.json(
      {
        error:
          "Server error: " +
          (err instanceof Error ? err.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
