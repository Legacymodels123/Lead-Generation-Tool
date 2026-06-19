import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { listEnrichmentJobs } from "@/lib/workspace/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const jobs = await listEnrichmentJobs(auth.userId);
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load jobs" },
      { status: 500 }
    );
  }
}
