import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthContext {
  userId: string;
  email?: string;
  source: "supabase";
  userMetadata?: Record<string, unknown>;
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("lg_session")?.value;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ?? cookieToken ?? null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (!error && data.user) {
    return {
      userId: data.user.id,
      email: data.user.email,
      source: "supabase",
      userMetadata: data.user.user_metadata as Record<string, unknown>,
    };
  }

  return null;
}

export function requireAuth(auth: AuthContext | null): AuthContext {
  if (!auth) throw new Error("Unauthorized");
  return auth;
}
