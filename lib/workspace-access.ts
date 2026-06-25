import type { ApiAuthContext } from "@/lib/api-auth";

export function canAccessWorkspace(auth: ApiAuthContext, workspaceId: string): boolean {
  return auth.workspaceId === workspaceId;
}
