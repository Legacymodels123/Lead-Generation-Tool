import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { createWorkspaceLead } from "@/lib/workspace/db";
import { csvToLeadInputs } from "@/lib/workspace/csv";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rows: ReturnType<typeof csvToLeadInputs> = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      rows = csvToLeadInputs(await file.text());
    } else {
      const body = await req.json();
      if (typeof body.csv === "string") {
        rows = csvToLeadInputs(body.csv);
      } else if (Array.isArray(body.leads)) {
        rows = body.leads;
      }
    }

    const created = [];
    for (const row of rows) {
      if (!row.company_name?.trim() && !row.domain?.trim()) continue;
      const lead = await createWorkspaceLead(auth.userId, auth.workspaceId, row);
      created.push(lead);
    }

    return NextResponse.json({ imported: created.length, leads: created });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
