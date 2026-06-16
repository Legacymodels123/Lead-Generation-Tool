import { createClient } from "@/lib/supabase/client";

let cachedToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return cachedToken;

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    cachedToken = data.session?.access_token ?? null;
    return cachedToken;
  } catch {
    return cachedToken;
  }
}

export async function buildApiHeaders(userId: string): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function setCachedToken(token: string | null): void {
  cachedToken = token;
}
