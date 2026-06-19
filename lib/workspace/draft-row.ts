import type { WorkspaceLead } from "./types";
import { DRAFT_ROW_ID } from "./constants";

export function createDraftWorkspaceLead(): WorkspaceLead {
  const now = new Date().toISOString();
  return {
    id: DRAFT_ROW_ID,
    user_id: "",
    workspace_id: "",
    company_name: "",
    domain: "",
    segment: "",
    fleet_brand: "",
    fleet_type: "",
    evidence_summary: "",
    evidence_url: "",
    confidence: "Low",
    lead_fit: "Weak",
    status: "New",
    owner: "",
    next_action: "",
    notes: "",
    validation_errors: [],
    created_at: now,
    updated_at: now,
  };
}

export function isDraftWorkspaceLead(lead: WorkspaceLead | undefined): boolean {
  return lead?.id === DRAFT_ROW_ID;
}
