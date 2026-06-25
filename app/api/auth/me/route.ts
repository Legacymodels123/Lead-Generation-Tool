import { NextRequest, NextResponse } from "next/server";
import { isAuthCloudEnabled } from "@/lib/auth/cloud";
import { getAppUserFromRequest } from "@/lib/api-auth";
import { getSessionUser } from "@/lib/server/store";
import { getSessionTokenFromRequest } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isAuthCloudEnabled()) {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    return NextResponse.json({ user });
  }

  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    getSessionTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = getSessionUser(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { password: _, ...userWithoutPassword } = sessionUser;
  return NextResponse.json({ user: userWithoutPassword });
}
