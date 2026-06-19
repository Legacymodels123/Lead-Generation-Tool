import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import {
  createWorkspaceLead,
  deleteWorkspaceLeads,
  listWorkspaceLeads,
  updateWorkspaceLead,
} from "@/lib/workspace/db";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return unauthorized();
  try {
    const leads = await listWorkspaceLeads(auth.userId, auth.workspaceId);
    return NextResponse.json({ leads });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load leads" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return unauthorized();
  try {
    const body = await req.json();
    if (body.action === "bulk_delete" && Array.isArray(body.ids)) {
      const deleted = await deleteWorkspaceLeads(auth.userId, body.ids);
      return NextResponse.json({ deleted });
    }
    const lead = await createWorkspaceLead(auth.userId, auth.workspaceId, body);
    return NextResponse.json({ lead });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return unauthorized();
  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const lead = await updateWorkspaceLead(auth.userId, id, patch);
    return NextResponse.json({ lead });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update lead" },
      { status: 500 }
    );
  }
}
