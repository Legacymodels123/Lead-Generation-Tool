export type LeadStatus =
  | "New"
  | "Researching"
  | "Needs Validation"
  | "Qualified"
  | "Contacted"
  | "Rejected";

export type Confidence = "Low" | "Medium" | "High";
export type LeadFit = "Weak" | "Medium" | "Strong";

export interface WorkspaceLead {
  id: string;
  user_id: string;
  workspace_id: string;
  company_name: string;
  domain: string;
  segment: string;
  fleet_brand: string;
  fleet_type: string;
  evidence_summary: string;
  evidence_url: string;
  confidence: Confidence;
  lead_fit: LeadFit;
  status: LeadStatus;
  owner: string;
  next_action: string;
  notes: string;
  validation_errors: string[];
  created_at: string;
  updated_at: string;
}

export type WorkspaceLeadInput = Omit<
  WorkspaceLead,
  "id" | "user_id" | "workspace_id" | "created_at" | "updated_at" | "validation_errors"
> & { validation_errors?: string[] };

export interface EnrichmentJob {
  id: string;
  user_id: string;
  lead_id: string;
  status: "pending" | "running" | "completed" | "failed";
  provider: string;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface EvidenceSource {
  id: string;
  lead_id: string;
  user_id: string;
  url: string;
  title: string;
  snippet: string;
  source_type: string;
  created_at: string;
}

/** Mock enrichment response — replace with real AI provider in /api/workspace/enrich */
export interface EnrichmentResult {
  evidence_summary: string;
  evidence_url: string;
  fleet_brand: string;
  fleet_type: string;
  confidence: Confidence;
  lead_fit: LeadFit;
  segment: string;
}
