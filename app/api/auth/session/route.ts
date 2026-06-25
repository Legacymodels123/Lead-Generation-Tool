import { NextRequest, NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/api-auth";
import { isMemoryAuthEnabled } from "@/lib/auth/cloud";
import { buildDemoUser, toPublicUser } from "@/lib/auth/demo";
import { ensureDemoSession, getSessionUser } from "@/lib/server/store";
import { attachSessionCookie, getSessionTokenFromRequest } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

/** Returns current user + token (Bearer or lg_session cookie). */
export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    getSessionTokenFromRequest(request);

  if (user && token) {
    return NextResponse.json({ user, token });
  }

  if (!isMemoryAuthEnabled()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const demoToken = ensureDemoSession();
  const demoUser = toPublicUser(getSessionUser(demoToken) ?? buildDemoUser());
  const response = NextResponse.json({ user: demoUser, token: demoToken });
  return attachSessionCookie(response, demoToken);
}
