import { REQUIRED_FIELDS } from "./constants";
import type { WorkspaceLead } from "./types";

export function validateLead(lead: Partial<WorkspaceLead>): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const val = lead[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      errors.push(`${field.replace(/_/g, " ")} is required`);
    }
  }

  if (lead.domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(lead.domain.trim())) {
    errors.push("domain must be a valid hostname (e.g. acme.com)");
  }

  if (lead.evidence_url && lead.evidence_url.trim()) {
    try {
      new URL(lead.evidence_url.startsWith("http") ? lead.evidence_url : `https://${lead.evidence_url}`);
    } catch {
      errors.push("evidence_url must be a valid URL");
    }
  }

  return errors;
}

export function isFieldMissing(lead: Partial<WorkspaceLead>, field: string): boolean {
  const val = lead[field as keyof WorkspaceLead];
  return val === undefined || val === null || String(val).trim() === "";
}
