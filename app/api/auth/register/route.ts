import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import { getUserByEmail, createUser, createSession } from "@/lib/server/store";
import type { User } from "@/lib/types";

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
      credits: 100,
      workspaceId: generateId(),
      transactions: [
        {
          id: generateId(),
          type: "bonus",
          amount: 100,
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

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return NextResponse.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
