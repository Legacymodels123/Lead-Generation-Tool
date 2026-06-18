import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getLead, updateLead } from "@/lib/server/store";

export const dynamic = "force-dynamic";

interface EnrichRequest {
  leadId: string;
}

// Mock AI enrichment - replace with OpenAI call if OPENAI_API_KEY is set
async function enrichWithAI(lead: any): Promise<any> {
  const hasOpenAiKey = process.env.OPENAI_API_KEY;

  if (hasOpenAiKey) {
    // Real OpenAI integration
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Analyze this company and provide enrichment data in JSON format.
Company: ${lead.company}
Website: ${lead.website}
Contact: ${lead.contactName}
Country: ${lead.country}

Return a JSON object with:
{
  "aiSummary": "Company summary",
  "fitReason": "Why this company fits",
  "score": <0-100>,
  "aiQualificationScore": <0-1>,
  "message": "Personalized message for outreach"
}

Keep it concise.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        try {
          const enrichment = JSON.parse(content);
          return enrichment;
        } catch {
          console.warn("Failed to parse OpenAI response as JSON");
          return getMockEnrichment(lead);
        }
      }
    } catch (error) {
      console.error("OpenAI enrichment failed:", error);
      return getMockEnrichment(lead);
    }
  }

  return getMockEnrichment(lead);
}

function getMockEnrichment(lead: any) {
  // Mock AI responses for development
  const scores: Record<string, number> = {
    SaaS: 85,
    Technology: 80,
    AI: 95,
    Software: 80,
  };

  const score = scores[lead.sector as string] || 75;

  return {
    aiSummary: `${lead.company} is a ${lead.sector || "tech"} company based in ${lead.country} with ${lead.employees || "multiple"} employees. Strong market potential.`,
    fitReason:
      lead.sector === "AI"
        ? "Leading AI market opportunity"
        : `Relevant ${lead.sector || "tech"} sector alignment`,
    score: score,
    aiQualificationScore: score / 100,
    message: `Hi ${lead.contactName || "there"},\n\nI came across ${lead.company} and was impressed by your work in ${lead.sector}. Would love to discuss partnership opportunities.\n\nBest regards`,
  };
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

    const body: EnrichRequest = await request.json();

    if (!body.leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const lead = getLead(body.leadId);
    if (!lead || lead.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Enrich with AI
    const enrichment = await enrichWithAI(lead);

    // Update lead with enriched data
    const updatedLead = updateLead(body.leadId, {
      ...enrichment,
      aiSummary: enrichment.aiSummary,
      score: enrichment.score,
      aiQualificationScore: enrichment.aiQualificationScore,
      message: enrichment.message,
      fitReason: enrichment.fitReason,
    });

    if (!updatedLead) {
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({
      lead: updatedLead,
      enrichment: {
        ...enrichment,
        source: process.env.OPENAI_API_KEY ? "openai" : "mock",
      },
    });
  } catch (error) {
    console.error("Enrich lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
