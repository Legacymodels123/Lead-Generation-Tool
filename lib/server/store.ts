import type { User, Lead } from "@/lib/types";

// In-memory store for development (replace with database in production)
interface Store {
  users: Map<string, User>;
  leads: Map<string, Lead>;
  sessions: Map<string, string>; // token -> userId
}

const globalStore: Store = {
  users: new Map(),
  leads: new Map(),
  sessions: new Map(),
};

// Initialize demo account
const demoUser: User = {
  id: "demo-user-001",
  email: "levi@legacy.com",
  password: "legacy123",
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
globalStore.sessions.set(Buffer.from(demoUser.id).toString("base64"), demoUser.id);

export function getUserByEmail(email: string): User | undefined {
  return globalStore.users.get(email);
}

export function getUserById(userId: string): User | undefined {
  for (const user of globalStore.users.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return undefined;
}

export function createUser(user: User): User {
  globalStore.users.set(user.email, user);
  return user;
}

export function updateUser(userId: string, updates: Partial<User>): User | undefined {
  const user = getUserById(userId);
  if (!user) return undefined;

  const updated = { ...user, ...updates };
  globalStore.users.set(updated.email, updated);
  return updated;
}

export function createSession(userId: string): string {
  const token = Buffer.from(userId + ":" + Date.now()).toString("base64");
  globalStore.sessions.set(token, userId);
  return token;
}

export function getSessionUser(token: string): User | undefined {
  const userId = globalStore.sessions.get(token);
  if (!userId) return undefined;
  return getUserById(userId);
}

export function deleteSession(token: string): void {
  globalStore.sessions.delete(token);
}

export function getLeads(workspaceId: string): Lead[] {
  return Array.from(globalStore.leads.values()).filter(
    (l) => l.workspaceId === workspaceId
  );
}

export function getLead(leadId: string): Lead | undefined {
  return globalStore.leads.get(leadId);
}

export function createLead(lead: Lead): Lead {
  globalStore.leads.set(lead.id, lead);
  return lead;
}

export function updateLead(leadId: string, updates: Partial<Lead>): Lead | undefined {
  const lead = globalStore.leads.get(leadId);
  if (!lead) return undefined;

  const updated = { ...lead, ...updates };
  globalStore.leads.set(leadId, updated);
  return updated;
}

