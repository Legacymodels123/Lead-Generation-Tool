import type { DmuRole } from "@/lib/types";

export interface DmuRoleDefinition {
  role: DmuRole;
  label: string;
  labelNl: string;
  titleKeywords: string[];
  description: string;
}

export const DMU_ROLES: DmuRoleDefinition[] = [
  {
    role: "marketing_brand",
    label: "Marketing / Brand Manager",
    labelNl: "Marketing / Brand Manager",
    titleKeywords: [
      "marketing",
      "brand",
      "communications",
      "communicatie",
      "marcom",
      "head of marketing",
      "marketing manager",
      "brand manager",
    ],
    description: "Primary outreach — co-branding and promotional scale models",
  },
  {
    role: "ceo_owner",
    label: "CEO / Owner",
    labelNl: "CEO / Eigenaar",
    titleKeywords: [
      "ceo",
      "owner",
      "eigenaar",
      "directeur",
      "managing director",
      "general manager",
      "founder",
      "oprichter",
      "directeur-eigenaar",
    ],
    description: "Budget authority — especially at SME dealers",
  },
];

export function getDmuRoleLabel(role: DmuRole): string {
  return DMU_ROLES.find((r) => r.role === role)?.labelNl ?? role;
}

export function inferDmuRoleFromTitle(title: string): DmuRole {
  const lower = title.toLowerCase();
  for (const def of DMU_ROLES) {
    if (def.titleKeywords.some((kw) => lower.includes(kw))) {
      return def.role;
    }
  }
  return "marketing_brand";
}
