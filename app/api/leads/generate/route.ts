import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/store";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GenerateRequest {
  company: string;
  industry?: string;
  country?: string;
  count?: number;
}

// Mock lead generation - replace with real AI-powered generation
async function generateLeads(params: GenerateRequest, count: number = 5): Promise<any[]> {
  const mockLeads = [
    {
      company: `${params.company} Partner A`,
      sector: params.industry || "Technology",
      country: params.country || "Netherlands",
      market: "Enterprise SaaS",
      employees: 150,
      website: `partner-a-${Date.now()}.com`,
    },
    {
      company: `${params.company} Partner B`,
      sector: params.industry || "Technology",
      country: params.country || "Netherlands",
      market: "Mid-Market",
      employees: 75,
      website: `partner-b-${Date.now()}.com`,
    },
    {
      company: `${params.company} Prospect`,
      sector: params.industry || "Technology",
      country: params.country || "Germany",
      market: "Startup",
      employees: 25,
      website: `prospect-${Date.now()}.com`,
    },
  ];

  return mockLeads.slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GenerateRequest = await request.json();

    if (!body.company) {
      return NextResponse.json({ error: "company required" }, { status: 400 });
    }

    const count = Math.min(body.count || 5, 10);

    // Generate leads (mock for now)
    const generatedLeads = await generateLeads(body, count);

    return NextResponse.json({
      leads: generatedLeads,
      count: generatedLeads.length,
      source: "mock",
      message: `Generated ${generatedLeads.length} leads based on "${body.company}"`,
    });
  } catch (error) {
    console.error("Generate leads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
