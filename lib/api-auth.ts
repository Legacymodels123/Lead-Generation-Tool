import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { isAuthCloudEnabled, isMemoryAuthEnabled } from "@/lib/auth/cloud";
import { mapSupabaseUserToAppUser } from "@/lib/auth/map-user";
import { resolveWorkspaceIdForUser } from "@/lib/auth/provision";
import { getSessionUser } from "@/lib/server/store";
import { getSessionTokenFromRequest } from "@/lib/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";

export interface ApiAuthContext {
  userId: string;
  workspaceId: string;
  email?: string;
}

function memoryAuthFromToken(token: string): ApiAuthContext | null {
  if (!isMemoryAuthEnabled()) return null;
  const user = getSessionUser(token);
  if (!user) return null;
  return {
    userId: user.id,
    workspaceId: user.workspaceId ?? DEFAULT_WORKSPACE_ID,
    email: user.email,
  };
}

export async function getApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const cookieToken = getSessionTokenFromRequest(req);
  const token = bearer ?? cookieToken;

  const auth = await getAuthFromRequest(req);
  if (auth) {
    const admin = createAdminClient();
    if (admin) {
      try {
        const workspaceId = await resolveWorkspaceIdForUser(admin, auth.userId);
        return {
          userId: auth.userId,
          workspaceId,
          email: auth.email,
        };
      } catch {
        /* fall through to memory */
      }
    }
    return null;
  }

  if (token) {
    const memory = memoryAuthFromToken(token);
    if (memory) return memory;
  }

  return null;
}

export async function getAppUserFromRequest(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const token = bearer ?? getSessionTokenFromRequest(req);

  if (token) {
    const memoryUser = getSessionUser(token);
    if (memoryUser) {
      const { password: _, ...user } = memoryUser;
      return user;
    }
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(auth.userId);
  if (error || !data.user) return null;

  return mapSupabaseUserToAppUser(admin, data.user);
}
