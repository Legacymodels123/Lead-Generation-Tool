import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createSession } from "@/lib/server/store";
import { attachSessionCookie } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = getUserByEmail(body.email);

    if (!user || user.password !== body.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createSession(user.id);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
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
