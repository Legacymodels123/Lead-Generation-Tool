import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { getSessionUser } from "@/lib/server/store";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";

export interface ApiAuthContext {
  userId: string;
  workspaceId: string;
  email?: string;
}

export async function getApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
  const auth = await getAuthFromRequest(req);
  if (auth) {
    return {
      userId: auth.userId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      email: auth.email,
    };
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const user = getSessionUser(token);
    if (user) {
      return {
        userId: user.id,
        workspaceId: user.workspaceId ?? DEFAULT_WORKSPACE_ID,
        email: user.email,
      };
    }
  }

  const userId = req.headers.get("x-user-id");
  if (userId) {
    return {
      userId,
      workspaceId: req.headers.get("x-workspace-id") ?? DEFAULT_WORKSPACE_ID,
    };
  }

  return null;
}
