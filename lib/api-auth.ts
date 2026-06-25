import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { isAuthCloudEnabled } from "@/lib/auth/cloud";
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

export async function getApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
  const auth = await getAuthFromRequest(req);
  if (auth) {
    const admin = createAdminClient();
    if (admin) {
      const workspaceId = await resolveWorkspaceIdForUser(
        admin,
        auth.userId,
        auth.userMetadata
      );
      return {
        userId: auth.userId,
        workspaceId,
        email: auth.email,
      };
    }
    const metaWorkspace = auth.userMetadata?.workspace_id;
    return {
      userId: auth.userId,
      workspaceId:
        typeof metaWorkspace === "string" && metaWorkspace.trim()
          ? metaWorkspace.trim()
          : DEFAULT_WORKSPACE_ID,
      email: auth.email,
    };
  }

  if (isAuthCloudEnabled()) {
    return null;
  }

  const token =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    getSessionTokenFromRequest(req);

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

  return null;
}

export async function getAppUserFromRequest(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(auth.userId);
  if (error || !data.user) return null;

  return mapSupabaseUserToAppUser(admin, data.user);
}
