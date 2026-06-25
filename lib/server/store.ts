import type { User, Lead } from "@/lib/types";
import { SEED_LEADS } from "@/lib/seed-data";
import { isDevMemoryAuthEnabled } from "@/lib/auth/cloud";

interface Store {
  users: Map<string, User>;
  leads: Map<string, Lead>;
  sessions: Map<string, string>;
}

const globalStore: Store = {
  users: new Map(),
  leads: new Map(),
  sessions: new Map(),
};

const DEV_DEMO_PASSWORD = "legacy123";

function initDevStore(): void {
  if (!isDevMemoryAuthEnabled()) return;
  if (globalStore.users.size > 0) return;

  const demoUser: User = {
    id: "demo-user-001",
    email: "levi@legacy.com",
    password: DEV_DEMO_PASSWORD,
    name: "Levi Kempen",
    company: "Legacy Scale Models",
    credits: 100,
    workspaceId: "legacy-scale-models",
    transactions: [
      {
        id: "tx-demo-001",
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

  globalStore.users.set(demoUser.email, demoUser);

  for (const lead of SEED_LEADS) {
    globalStore.leads.set(lead.id, {
      ...lead,
      workspaceId: demoUser.workspaceId!,
    });
  }
}

function assertDevStore(): void {
  if (!isDevMemoryAuthEnabled()) {
    throw new Error("In-memory store is only available in local development without Supabase");
  }
  initDevStore();
}

export function getUserByEmail(email: string): User | undefined {
  assertDevStore();
  return globalStore.users.get(email.toLowerCase());
}

export function getUserById(userId: string): User | undefined {
  assertDevStore();
  for (const user of globalStore.users.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return undefined;
}

export function createUser(user: User): User {
  assertDevStore();
  globalStore.users.set(user.email.toLowerCase(), user);
  return user;
}

export function updateUser(userId: string, updates: Partial<User>): User | undefined {
  assertDevStore();
  const user = getUserById(userId);
  if (!user) return undefined;

  const updated = { ...user, ...updates };
  globalStore.users.set(updated.email.toLowerCase(), updated);
  return updated;
}

export function createSession(userId: string): string {
  assertDevStore();
  const token = Buffer.from(userId + ":" + Date.now()).toString("base64");
  globalStore.sessions.set(token, userId);
  return token;
}

export function getSessionUser(token: string): User | undefined {
  if (!isDevMemoryAuthEnabled()) return undefined;
  initDevStore();
  const userId = globalStore.sessions.get(token);
  if (!userId) return undefined;
  return getUserById(userId);
}

export function deleteSession(token: string): void {
  if (!isDevMemoryAuthEnabled()) return;
  globalStore.sessions.delete(token);
}

export function getLeads(workspaceId: string): Lead[] {
  assertDevStore();
  return Array.from(globalStore.leads.values()).filter((l) => l.workspaceId === workspaceId);
}

export function getLead(leadId: string): Lead | undefined {
  assertDevStore();
  return globalStore.leads.get(leadId);
}

export function createLead(lead: Lead): Lead {
  assertDevStore();
  globalStore.leads.set(lead.id, lead);
  return lead;
}

export function updateLead(leadId: string, updates: Partial<Lead>): Lead | undefined {
  assertDevStore();
  const lead = globalStore.leads.get(leadId);
  if (!lead) return undefined;

  const updated = { ...lead, ...updates };
  globalStore.leads.set(leadId, updated);
  return updated;
}
