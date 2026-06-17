import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getLeads, createLead, updateLead } from "@/lib/server/store";
import { generateId } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getSessionUser(token);
    if (!user || !user.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = getLeads(user.workspaceId);
    return NextResponse.json({ leads, batches: [] });
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getSessionUser(token);
    if (!user || !user.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const newLead: Lead = {
      id: generateId(),
      workspaceId: user.workspaceId || "default",
      company: body.company || "",
      country: body.country || "",
      market: body.market || "",
      employees: body.employees || 0,
      revenue: body.revenue || "",
      sector: body.sector || "",
      fitReason: body.fitReason || "",
      website: body.website || "",
      linkedinCompanyUrl: body.linkedinCompanyUrl || "",
      contactName: body.contactName || "",
      contactTitle: body.contactTitle || "",
      linkedinUrl: body.linkedinUrl || "",
      status: "not_qualified",
      batch: body.batch || "manual",
      isNew: true,
      notes: body.notes || "",
      message: body.message || "",
      score: 0,
      source: "manual",
      contacts: body.contacts || [],
    };

    createLead(newLead);
    return NextResponse.json({ lead: newLead });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, ...updates } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const updated = updateLead(leadId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: updated });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
