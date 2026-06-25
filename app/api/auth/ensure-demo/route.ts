import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { ensureLegacyDemoMembership } from "@/lib/auth/provision";

const DEMO_EMAIL = "levi@legacy.com";
const DEMO_PASSWORD = "legacy123";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !verifyCronAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud not configured" }, { status: 503 });
  }

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase()
  );

  let userId: string;

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: "Levi Kempen",
        company: "Legacy Scale Models",
      },
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: "Levi Kempen",
        company: "Legacy Scale Models",
      },
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    userId = created.user.id;
  }

  await ensureLegacyDemoMembership(supabase, userId, DEMO_EMAIL, "Levi Kempen");

  return NextResponse.json({ ok: true, userId, created: !existing });
}
