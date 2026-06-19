export type LeadStatus = "qualified" | "not_qualified";

export type LeadSource = "manual" | "linkedin_import" | "hubspot_sync" | "ai_generated" | "batch_nightly";

export type AiStatus = "idle" | "running" | "done" | "error";

export type DmuRole = "marketing_brand" | "ceo_owner";

export type TeamMemberRole = "admin" | "member";

export type IntegrationProvider =
  | "linkedin"
  | "hubspot"
  | "salesnavigator"
  | "openai"
  | "anthropic"
  | "hunter"
  | "apollo"
  | "firecrawl";

export type IntegrationStatus = "connected" | "pending" | "expired" | "error";

export type CustomColumnType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "email"
  | "url"
  | "ai_enriched";

export type ColumnConditionOperator = "eq" | "neq" | "empty" | "not_empty";

export interface ColumnCondition {
  field: string;
  operator: ColumnConditionOperator;
  value?: string;
}

export interface McpConnection {
  id: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "header";
  token?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  lastStatus?: "ok" | "error" | "unknown";
  lastCheckedAt?: string;
}

export type ColumnAutomationKind = "ai" | "enrich" | "research" | "score" | "hubspot";

export interface ColumnAutomation {
  kind: ColumnAutomationKind;
  prompt?: string;
  field?: "email" | "phone";
  source?: "website";
  hubspotProperty?: string;
}

export type ImportExportJobType = "import" | "export";

export type ImportExportStatus = "pending" | "processing" | "completed" | "failed";

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
  enrichmentProvider?: string;
  aiMessage?: string;
  aiSummary?: string;
  aiNextStep?: string;
  message?: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  company: string;
  city: string;
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
  source?: LeadSource;
  aiQualificationScore?: number;
  contacts: Contact[];
  expanded?: boolean;
  customValues?: Record<string, string>;
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

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
  readonly?: boolean;
}

export interface WorkspaceConfig {
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    hubspot?: string;
    hunter?: string;
    apollo?: string;
    instantly?: string;
    lusha?: string;
  };
  oauth?: Record<string, unknown>;
  columns?: ColumnConfig[];
  leadStatuses?: LeadStatus[];
  mcpServers?: McpConnection[];
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  icpConfigId: string;
  config?: WorkspaceConfig;
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  qualified: "✓ Gekwalificeerd",
  not_qualified: "✗ Niet gekwalificeerd",
};

export const LEGACY_STATUS_MAPPING: Record<string, LeadStatus> = {
  nieuw: "not_qualified",
  bekeken: "not_qualified",
  verstuurd: "qualified",
  opvolgen: "qualified",
  gewonnen: "qualified",
  verloren: "not_qualified",
};

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "company", label: "Bedrijf", visible: true, order: 0, readonly: true },
  { key: "market", label: "Markt", visible: true, order: 1 },
  { key: "sector", label: "Sector", visible: true, order: 2 },
  { key: "fitReason", label: "Waarom fit", visible: true, order: 3 },
  { key: "employees", label: "Medewerkers", visible: true, order: 4 },
  { key: "website", label: "Website", visible: true, order: 5 },
  { key: "score", label: "Score", visible: true, order: 6 },
  { key: "aiQualificationScore", label: "AI Score", visible: true, order: 7 },
  { key: "status", label: "Status", visible: true, order: 8, readonly: true },
  { key: "aiSummary", label: "AI Samenvatting", visible: false, order: 9 },
];

export const CREDIT_COSTS = {
  addLead: 5,
  nightlyBatch: 10,
  copyMessage: 0,
  enrich: 3,
  hubspotSync: 2,
  findLeadsViaAi: 15,
} as const;

export const STARTING_CREDITS = 100;
export const NIGHTLY_BATCH_LEADS = 3;

export const DEFAULT_WORKSPACE_ID = "legacy-scale-models";

// ===== NEW TYPES FOR PHASE 1 & 2 =====

export interface CustomColumn {
  id: string;
  workspaceId: string;
  key: string;
  label: string;
  type: CustomColumnType;
  visible: boolean;
  order: number;
  defaultValue?: string | number | boolean;
  selectOptions?: string[];
  aiPrompt?: string;
  automation?: ColumnAutomation;
  condition?: ColumnCondition;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: TeamMemberRole;
  status: "active" | "invited" | "removed";
  invitationToken?: string;
  invitationExpiresAt?: string;
  addedAt: string;
  invitedBy?: string;
  email?: string;
  name?: string;
}

export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  rateLimitMonthly: number;
  apiQuota: number;
  maxCustomColumns: number;
  storageLimitGb: number;
  maxTeamMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsageAnalytics {
  id: string;
  workspaceId: string;
  userId: string;
  date: string;
  leadsCreated: number;
  leadsEnriched: number;
  apiCallsUsed: number;
  creditsSpent: number;
  createdAt: string;
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  userId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string;
  expiresAt?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnMapping {
  id: string;
  workspaceId: string;
  sourceField: string;
  targetColumnKey: string;
  createdAt: string;
}

export interface ImportExportJob {
  id: string;
  workspaceId: string;
  userId: string;
  type: ImportExportJobType;
  status: ImportExportStatus;
  filePath?: string;
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DMUNode {
  id: string;
  title: string;
  name?: string;
  email?: string;
  linkedinUrl?: string;
  role: DmuRole;
  x: number;
  y: number;
  level?: number;
}

export interface DMUEdge {
  from: string;
  to: string;
  type: "reports_to" | "collaborates_with" | "approves";
}

export interface DMUSketch {
  id: string;
  workspaceId: string;
  leadId: string;
  nodes: DMUNode[];
  edges: DMUEdge[];
  svgData?: string;
  aiInsights?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  leadsCreated: number;
  leadsEnriched: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  creditsSpent: number;
  storageUsedGb: number;
  storageLimit: number;
  teamMembers: number;
  teamMembersLimit: number;
  customColumns: number;
  customColumnsLimit: number;
}
