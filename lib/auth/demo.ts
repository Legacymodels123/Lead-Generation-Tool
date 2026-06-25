import type { User } from "@/lib/types";
import { STARTING_CREDITS } from "@/lib/types";

export const DEMO_EMAIL = "levi@legacy.com";
export const DEMO_PASSWORD = "legacy123";
export const DEMO_SESSION_TOKEN = "lg-demo-session-v1";
export const DEMO_USER_ID = "demo-user-001";
export const DEMO_WORKSPACE_ID = "legacy-scale-models";

export function buildDemoUser(): User {
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    name: "Levi Kempen",
    company: "Legacy Scale Models",
    credits: STARTING_CREDITS,
    workspaceId: DEMO_WORKSPACE_ID,
    transactions: [
      {
        id: "tx-demo-001",
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
}

export function toPublicUser(user: User): Omit<User, "password"> {
  const { password: _, ...publicUser } = user;
  return publicUser;
}

export function isDemoCredentials(email: string, password: string): boolean {
  return email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}
