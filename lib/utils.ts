import type { Lead } from "./types";
import { getIcpForWorkspace } from "./workspace/context";

export const FLAGS: Record<string, string> = {
  Duitsland: "🇩🇪",
  Nederland: "🇳🇱",
  België: "🇧🇪",
  Noorwegen: "🇳🇴",
  Portugal: "🇵🇹",
};

export const STATUS_CLASS: Record<string, string> = {
  qualified: "s-qualified",
  not_qualified: "s-not_qualified",
};

export function scoreColor(score: number): string {
  if (score >= 85) return "#16a34a";
  if (score >= 70) return "#ea580c";
  return "#888";
}

export function fitScore(
  p: Pick<Lead, "employees" | "sector" | "country" | "workspaceId"> & { market?: string }
): number {
  const icp = getIcpForWorkspace(p.workspaceId ?? "legacy-scale-models");
  let s = 50;

  if (p.employees >= 1000) s += 30;
  else if (p.employees >= 500) s += 25;
  else if (p.employees >= 200) s += 18;
  else if (p.employees >= icp.minEmployees) s += 10;

  const marketMatch = icp.markets.find(
    (m) =>
      m.label === (p.market ?? "") ||
      m.sectorTags.includes(p.sector) ||
      m.keywords.some((kw) => p.sector.toLowerCase().includes(kw))
  );
  if (marketMatch) s += marketMatch.scoreBonus;
  else if (
    ["Agri Machinery", "Agri Importer", "Agri Dealer", "Agri Manufacturer"].includes(p.sector)
  ) {
    s += 15;
  } else if (p.sector === "Agri Trading") s += 10;

  const countryBonus = icp.countryScoreBonus[p.country];
  if (countryBonus) s += countryBonus;
  else if (p.country === "Nederland") s += 5;

  return Math.min(s, 99);
}

export function withScores(leads: Lead[]): Lead[] {
  return leads.map((l) => ({ ...l, score: fitScore(l) }));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function todayBatchDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
