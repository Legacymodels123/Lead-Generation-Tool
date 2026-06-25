import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudEnabled } from "@/lib/data/is-cloud";
import {
  createLeadInDb,
  loadLeadsWithContacts,
  seedLeadsToDbIfEmpty,
  updateLeadInDb,
} from "@/lib/data/leads-db";
import { getLeads, createLead, updateLead, getSessionUser } from "@/lib/server/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_LEADS } from "@/lib/seed-data";
import type { Lead } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { defaultContactsForAccount, normalizeLead } from "@/lib/utils/contacts";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) return unauthorized();

    const supabase = createAdminClient();
    if (isCloudEnabled() && supabase) {
      await seedLeadsToDbIfEmpty(supabase, auth.userId, auth.workspaceId, SEED_LEADS);
      const leads = await loadLeadsWithContacts(supabase, auth.userId, auth.workspaceId);
      return NextResponse.json({ leads, batches: [] });
    }

    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const user = token ? getSessionUser(token) : null;
    if (!user?.workspaceId) return unauthorized();

    const leads = getLeads(user.workspaceId);
    return NextResponse.json({ leads, batches: [] });
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) return unauthorized();

    const body = await req.json();
    const input: Omit<Lead, "id" | "workspaceId"> = {
      company: body.company || "",
      city: body.city || "",
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
      status: body.status || "not_qualified",
      batch: body.batch || "manual",
      isNew: body.isNew ?? true,
      notes: body.notes || "",
      message: body.message || "",
      score: body.score ?? 0,
      source: body.source || "manual",
      contacts: body.contacts?.length ? body.contacts : defaultContactsForAccount({ id: "temp" }),
      customValues: body.customValues,
    };

    const supabase = createAdminClient();
    if (isCloudEnabled() && supabase) {
      const lead = await createLeadInDb(supabase, auth.userId, auth.workspaceId, input);
      return NextResponse.json({ lead });
    }

    const newLead = normalizeLead({
      ...input,
      id: generateId(),
      workspaceId: auth.workspaceId,
    } as Lead);
    createLead(newLead);
    return NextResponse.json({ lead: newLead });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getApiAuth(req);
    if (!auth) return unauthorized();

    const body = await req.json();
    const { leadId, ...updates } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (isCloudEnabled() && supabase) {
      const updated = await updateLeadInDb(supabase, auth.userId, leadId, updates);
      if (!updated) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      return NextResponse.json({ lead: updated });
    }

    const updated = updateLead(leadId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ lead: updated });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
