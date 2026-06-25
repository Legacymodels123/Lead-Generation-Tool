import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { attachSessionCookie } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

/** Sets httpOnly session cookie when client already has a valid Bearer token. */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.cookies.get("lg_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "No session token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  return attachSessionCookie(response, token);
}
