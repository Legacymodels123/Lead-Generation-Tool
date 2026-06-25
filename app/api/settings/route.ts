import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({});

  const { data } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", auth.userId)
    .maybeSingle();

  return NextResponse.json((data?.settings as Record<string, unknown>) ?? {});
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ ok: true });

  await supabase.from("user_settings").upsert({
    user_id: auth.userId,
    settings: body,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
