import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthContext {
  userId: string;
  email?: string;
  source: "supabase" | "header";
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      const supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return { userId: data.user.id, email: data.user.email, source: "supabase" };
      }
    }
  }

  const userId = req.headers.get("x-user-id");
  if (userId) {
    return { userId, source: "header" };
  }

  return null;
}

export function requireAuth(auth: AuthContext | null): AuthContext {
  if (!auth) throw new Error("Unauthorized");
  return auth;
}
