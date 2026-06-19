import type { Confidence, LeadFit, LeadStatus } from "./types";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Researching",
  "Needs Validation",
  "Qualified",
  "Contacted",
  "Rejected",
];

export const CONFIDENCE_LEVELS: Confidence[] = ["Low", "Medium", "High"];
export const LEAD_FIT_LEVELS: LeadFit[] = ["Weak", "Medium", "Strong"];

export const SEGMENT_OPTIONS = [
  "Bus OEM",
  "Coach Operator",
  "Fleet Leasing",
  "Dealer Network",
  "Municipal Transport",
  "Logistics",
  "Other",
];

/** Fields required before a lead can be considered valid */
export const REQUIRED_FIELDS = ["company_name", "domain", "status"] as const;
