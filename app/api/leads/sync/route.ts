import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { isCloudDataEnabled } from "@/lib/data/is-cloud";
import { syncLeadsToMemory } from "@/lib/server/store";
import type { Lead } from "@/lib/types";
import { normalizeLead } from "@/lib/utils/contacts";

export const dynamic = "force-dynamic";

/** Hydrate in-memory store from browser localStorage cache (serverless-safe). */
export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isCloudDataEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, storage: "supabase" });
  }

  const body = (await req.json()) as { leads?: Lead[] };
  if (!Array.isArray(body.leads)) {
    return NextResponse.json({ error: "leads array required" }, { status: 400 });
  }

  const normalized = body.leads.map((lead) =>
    normalizeLead({ ...lead, workspaceId: auth.workspaceId })
  );
  const count = syncLeadsToMemory(auth.workspaceId, normalized);

  return NextResponse.json({ ok: true, count, storage: "memory" });
}
