import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import {
  createEnrichmentJob,
  getWorkspaceLead,
  updateWorkspaceLead,
} from "@/lib/workspace/db";
import type { EnrichmentResult } from "@/lib/workspace/types";

export const dynamic = "force-dynamic";

/**
 * Mock enrichment endpoint.
 * TODO: Replace mockEnrichment() with real AI provider calls (OpenAI, Claude, etc.)
 * and persist evidence_sources rows from returned citations.
 */
function mockEnrichment(companyName: string, domain: string): EnrichmentResult {
  const brand = companyName.split(" ")[0] || "Unknown";
  return {
    evidence_summary: `${companyName} operates a mixed fleet with documented ${brand} vehicles. Evidence gathered from public fleet listings.`,
    evidence_url: domain ? `https://${domain}/fleet` : "https://example.com/evidence",
    fleet_brand: `${brand} Coaches`,
    fleet_type: "Intercity + Regional",
    confidence: "Medium",
    lead_fit: "Strong",
    segment: "Coach Operator",
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await getWorkspaceLead(auth.userId, id);
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      company_name?: string;
      domain?: string;
    };

    const companyName = body.company_name || existing.company_name || "Unknown";
    const domain = body.domain || existing.domain || "";

    // TODO: Pass full lead context to real enrichment provider (web search, fleet DB, etc.)
    const result = mockEnrichment(companyName, domain);

    const lead = await updateWorkspaceLead(auth.userId, id, {
      ...result,
      status: "Researching",
    });

    await createEnrichmentJob(auth.userId, id, result as unknown as Record<string, unknown>);

    return NextResponse.json({ lead, enrichment: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Enrichment failed" },
      { status: 500 }
    );
  }
}
