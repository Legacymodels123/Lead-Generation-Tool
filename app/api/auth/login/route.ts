import { NextRequest, NextResponse } from "next/server";
import { isAuthCloudEnabled } from "@/lib/auth/cloud";
import { mapSupabaseUserToAppUser } from "@/lib/auth/map-user";
import { ensureLegacyDemoMembership } from "@/lib/auth/provision";
import { getUserByEmail, createSession } from "@/lib/server/store";
import { attachSessionCookie } from "@/lib/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonAuthClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

interface LoginRequest {
  email: string;
  password: string;
}

const DEMO_EMAIL = "levi@legacy.com";

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (isAuthCloudEnabled()) {
      const anon = createAnonAuthClient();
      const admin = createAdminClient();
      if (!anon || !admin) {
        return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
      }

      const { data, error } = await anon.auth.signInWithPassword({
        email: body.email.toLowerCase(),
        password: body.password,
      });

      if (error || !data.session || !data.user) {
        return NextResponse.json(
          { error: error?.message ?? "Invalid email or password" },
          { status: 401 }
        );
      }

      if (body.email.toLowerCase() === DEMO_EMAIL) {
        await ensureLegacyDemoMembership(
          admin,
          data.user.id,
          data.user.email ?? DEMO_EMAIL,
          typeof data.user.user_metadata?.name === "string"
            ? data.user.user_metadata.name
            : "Levi Kempen"
        );
      }

      const user = await mapSupabaseUserToAppUser(admin, data.user);
      const token = data.session.access_token;
      const response = NextResponse.json({ user, token });
      return attachSessionCookie(response, token);
    }

    const user = getUserByEmail(body.email);
    if (!user || user.password !== body.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createSession(user.id);
    const { password: _, ...userWithoutPassword } = user;
    const response = NextResponse.json({
      user: userWithoutPassword,
      token,
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
