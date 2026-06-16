export type LeadStatus =
  | "nieuw"
  | "bekeken"
  | "verstuurd"
  | "opvolgen"
  | "gewonnen"
  | "verloren";

export type AiStatus = "idle" | "running" | "done" | "error";

export type DmuRole = "marketing_brand" | "ceo_owner";

export type EnrichmentStatus = "idle" | "running" | "done" | "error";

export type EmailConfidence = "low" | "medium" | "high";

export interface Contact {
  id: string;
  accountId: string;
  dmuRole: DmuRole;
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  hubspotContactId?: string;
  enrichmentStatus: EnrichmentStatus;
  emailConfidence?: EmailConfidence;
  aiMessage?: string;
  aiSummary?: string;
  aiNextStep?: string;
  message?: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  company: string;
  country: string;
  market: string;
  employees: number;
  revenue: string;
  sector: string;
  fitReason: string;
  website: string;
  linkedinCompanyUrl: string;
  hubspotCompanyId?: string;
  contactName: string;
  contactTitle: string;
  linkedinUrl: string;
  status: LeadStatus;
  batch: string;
  isNew: boolean;
  notes: string;
  message: string;
  score?: number;
  aiMessage?: string;
  aiSummary?: string;
  aiNextStep?: string;
  aiStatus?: AiStatus;
  contacts: Contact[];
  expanded?: boolean;
}

export interface Batch {
  id: string;
  date: string;
  label: string;
  leadCount: number;
  creditsUsed: number;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  type: "purchase" | "spend" | "bonus";
  amount: number;
  description: string;
  createdAt: string;
}

export interface Integrations {
  linkedin: boolean;
  crm: boolean;
  webhooks: boolean;
  nightlyAgent: boolean;
  hubspotConnected?: boolean;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  company: string;
  credits: number;
  transactions: CreditTransaction[];
  integrations: Integrations;
  workspaceId?: string;
}

export interface UserData {
  leads: Lead[];
  batches: Batch[];
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  icpConfigId: string;
}

export const CREDIT_COSTS = {
  addLead: 5,
  nightlyBatch: 10,
  copyMessage: 0,
  enrich: 3,
  hubspotSync: 2,
} as const;

export const STARTING_CREDITS = 100;
export const NIGHTLY_BATCH_LEADS = 3;

export const DEFAULT_WORKSPACE_ID = "legacy-scale-models";
