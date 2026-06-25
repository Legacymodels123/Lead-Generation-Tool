import { NextRequest, NextResponse } from "next/server";
import { isAuthCloudEnabled, isMemoryAuthEnabled } from "@/lib/auth/cloud";
import { isDemoCredentials, DEMO_EMAIL } from "@/lib/auth/demo";
import { mapSupabaseUserToAppUser } from "@/lib/auth/map-user";
import { ensureLegacyDemoMembership } from "@/lib/auth/provision";
import { getUserByEmail, createSession, ensureDemoSession } from "@/lib/server/store";
import { attachSessionCookie } from "@/lib/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonAuthClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

interface LoginRequest {
  email: string;
  password: string;
}

const DEMO_EMAIL_LEGACY = DEMO_EMAIL;

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
        if (isMemoryAuthEnabled() && isDemoCredentials(body.email, body.password)) {
          const user = getUserByEmail(body.email);
          if (user && user.password === body.password) {
            const token = ensureDemoSession();
            const { password: _, ...userWithoutPassword } = user;
            const response = NextResponse.json({ user: userWithoutPassword, token });
            return attachSessionCookie(response, token);
          }
        }
        return NextResponse.json(
          { error: error?.message ?? "Invalid email or password" },
          { status: 401 }
        );
      }

      if (body.email.toLowerCase() === DEMO_EMAIL_LEGACY) {
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

    const token =
      isDemoCredentials(body.email, body.password) ? ensureDemoSession() : createSession(user.id);
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
