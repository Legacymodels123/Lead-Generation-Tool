import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import { isAuthCloudEnabled } from "@/lib/auth/cloud";
import { mapSupabaseUserToAppUser } from "@/lib/auth/map-user";
import { provisionUserWorkspace } from "@/lib/auth/provision";
import { getUserByEmail, createUser, createSession } from "@/lib/server/store";
import { attachSessionCookie } from "@/lib/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonAuthClient } from "@/lib/supabase/anon";
import type { User } from "@/lib/types";
import { STARTING_CREDITS } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    if (!body.email || !body.password || !body.name || !body.company) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (isAuthCloudEnabled()) {
      const admin = createAdminClient();
      const anon = createAnonAuthClient();
      if (!admin || !anon) {
        return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
      }

      const email = body.email.toLowerCase();

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          name: body.name,
          company: body.company,
        },
      });

      if (createError || !created.user) {
        const message = createError?.message ?? "Registration failed";
        const status = message.toLowerCase().includes("already") ? 409 : 400;
        return NextResponse.json({ error: message }, { status });
      }

      await provisionUserWorkspace(
        admin,
        created.user.id,
        email,
        body.name,
        body.company
      );

      const { data: sessionData, error: signInError } = await anon.auth.signInWithPassword({
        email,
        password: body.password,
      });

      if (signInError || !sessionData.session || !sessionData.user) {
        return NextResponse.json(
          { error: signInError?.message ?? "Account created but sign-in failed" },
          { status: 500 }
        );
      }

      const user = await mapSupabaseUserToAppUser(admin, sessionData.user);
      const token = sessionData.session.access_token;
      const response = NextResponse.json({ user, token });
      return attachSessionCookie(response, token);
    }

    if (getUserByEmail(body.email)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const newUser: User = {
      id: generateId(),
      email: body.email.toLowerCase(),
      password: body.password,
      name: body.name,
      company: body.company,
      credits: STARTING_CREDITS,
      workspaceId: generateId(),
      transactions: [
        {
          id: generateId(),
          type: "bonus",
          amount: STARTING_CREDITS,
          description: "Welcome bonus",
          createdAt: new Date().toISOString(),
        },
      ],
      integrations: {
        linkedin: false,
        crm: false,
        webhooks: false,
        nightlyAgent: false,
      },
    };

    createUser(newUser);
    const token = createSession(newUser.id);

    const { password, ...userWithoutPassword } = newUser;
    const response = NextResponse.json({
      user: userWithoutPassword,
      token,
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
