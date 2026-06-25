import { isMemoryAuthEnabled } from "@/lib/auth/cloud";
import {
  buildDemoUser,
  DEMO_SESSION_TOKEN,
  DEMO_WORKSPACE_ID,
} from "@/lib/auth/demo";
import type { User, Lead } from "@/lib/types";
import { SEED_LEADS } from "@/lib/seed-data";

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

function initMemoryStore(): void {
  if (!isMemoryAuthEnabled()) return;
  if (globalStore.users.size > 0) return;

  const demoUser = buildDemoUser();
  globalStore.users.set(demoUser.email.toLowerCase(), demoUser);
  globalStore.sessions.set(DEMO_SESSION_TOKEN, demoUser.id);

  for (const lead of SEED_LEADS) {
    globalStore.leads.set(lead.id, {
      ...lead,
      workspaceId: DEMO_WORKSPACE_ID,
    });
  }
}

function assertMemoryStore(): void {
  if (!isMemoryAuthEnabled()) {
    throw new Error("Memory store is disabled");
  }
  initMemoryStore();
}

export function ensureDemoSession(): string {
  assertMemoryStore();
  return DEMO_SESSION_TOKEN;
}

export function getUserByEmail(email: string): User | undefined {
  assertMemoryStore();
  return globalStore.users.get(email.toLowerCase());
}

export function getUserById(userId: string): User | undefined {
  assertMemoryStore();
  for (const user of globalStore.users.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return undefined;
}

export function createUser(user: User): User {
  assertMemoryStore();
  globalStore.users.set(user.email.toLowerCase(), user);
  return user;
}

export function updateUser(userId: string, updates: Partial<User>): User | undefined {
  assertMemoryStore();
  const user = getUserById(userId);
  if (!user) return undefined;

  const updated = { ...user, ...updates };
  globalStore.users.set(updated.email.toLowerCase(), updated);
  return updated;
}

export function createSession(userId: string): string {
  assertMemoryStore();
  const token = Buffer.from(userId + ":" + Date.now()).toString("base64");
  globalStore.sessions.set(token, userId);
  return token;
}

export function getSessionUser(token: string): User | undefined {
  if (!isMemoryAuthEnabled()) return undefined;
  initMemoryStore();
  const userId = globalStore.sessions.get(token);
  if (!userId) return undefined;
  return getUserById(userId);
}

export function deleteSession(token: string): void {
  if (!isMemoryAuthEnabled()) return;
  globalStore.sessions.delete(token);
}

export function getLeads(workspaceId: string): Lead[] {
  assertMemoryStore();
  return Array.from(globalStore.leads.values()).filter((l) => l.workspaceId === workspaceId);
}

export function getLead(leadId: string): Lead | undefined {
  assertMemoryStore();
  return globalStore.leads.get(leadId);
}

export function createLead(lead: Lead): Lead {
  assertMemoryStore();
  globalStore.leads.set(lead.id, lead);
  return lead;
}

export function updateLead(leadId: string, updates: Partial<Lead>): Lead | undefined {
  assertMemoryStore();
  const lead = globalStore.leads.get(leadId);
  if (!lead) return undefined;

  const updated = { ...lead, ...updates };
  globalStore.leads.set(leadId, updated);
  return updated;
}

export function syncLeadsToMemory(workspaceId: string, leads: Lead[]): number {
  assertMemoryStore();
  let count = 0;
  for (const lead of leads) {
    if (lead.workspaceId !== workspaceId) continue;
    globalStore.leads.set(lead.id, lead);
    count += 1;
  }
  return count;
}
