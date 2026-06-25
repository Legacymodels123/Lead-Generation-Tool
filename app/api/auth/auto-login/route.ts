import { NextRequest, NextResponse } from "next/server";
import { isMemoryAuthEnabled } from "@/lib/auth/cloud";
import { buildDemoUser, toPublicUser } from "@/lib/auth/demo";
import { getAppUserFromRequest } from "@/lib/api-auth";
import { ensureDemoSession, getSessionUser } from "@/lib/server/store";
import { attachSessionCookie } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

function demoSessionResponse(): NextResponse {
  const token = ensureDemoSession();
  const user = toPublicUser(getSessionUser(token) ?? buildDemoUser());
  const response = NextResponse.json({ user, token });
  return attachSessionCookie(response, token);
}

/** GET: auto-login then redirect (middleware). POST: JSON session for client bootstrap. */
export async function GET(request: NextRequest) {
  if (!isMemoryAuthEnabled()) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const next = request.nextUrl.searchParams.get("next") || "/workspace";
  const token = ensureDemoSession();
  const response = NextResponse.redirect(new URL(next, request.url));
  return attachSessionCookie(response, token);
}

export async function POST() {
  if (!isMemoryAuthEnabled()) {
    return NextResponse.json({ error: "Memory auth disabled" }, { status: 403 });
  }
  return demoSessionResponse();
}
