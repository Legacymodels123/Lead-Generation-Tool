import type { DmuRole } from "@/lib/types";

export interface IcpMarket {
  id: string;
  label: string;
  keywords: string[];
  sectorTags: string[];
  scoreBonus: number;
}

export interface IcpConfig {
  id: string;
  name: string;
  companyDescription: string;
  markets: IcpMarket[];
  dmuRoles: DmuRole[];
  minEmployees: number;
  preferredCountries: string[];
  countryScoreBonus: Record<string, number>;
  useCases: string[];
  minOrderUnits: number;
}
