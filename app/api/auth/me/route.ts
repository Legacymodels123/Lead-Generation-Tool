import { NextRequest, NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
