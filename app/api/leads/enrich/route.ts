import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { enrichLeadForWorkspace } from "@/lib/enrichment/enrich-lead-server";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EnrichRequest {
  leadId: string;
  leads?: Lead[];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: EnrichRequest = await request.json();
    if (!body.leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const result = await enrichLeadForWorkspace(auth.userId, auth.workspaceId, body.leadId);
    if (!result.lead && body.leads?.length) {
      const fallback = body.leads.find((l) => l.id === body.leadId);
      if (fallback) {
        const retry = await enrichLeadForWorkspace(
          auth.userId,
          fallback.workspaceId ?? auth.workspaceId,
          body.leadId
        );
        if (retry.lead) {
          return NextResponse.json({
            lead: retry.lead,
            enrichment: { source: "waterfall" },
          });
        }
      }
    }

    if (!result.lead) {
      return NextResponse.json(
        { error: result.error ?? "Lead not found" },
        { status: result.error === "Lead not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      lead: result.lead,
      enrichment: { source: "waterfall" },
    });
  } catch (error) {
    console.error("Enrich lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
