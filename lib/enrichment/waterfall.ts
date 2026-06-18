import { apolloEnricher } from "./apollo-enricher";
import { claudeEnricher } from "./claude-enricher";
import { hunterEnricher } from "./hunter-enricher";
import { createWaterfall, type EnrichmentProvider } from "./provider";

export function buildEnrichmentWaterfall(hasAi: boolean) {
  const providers: EnrichmentProvider[] = [];
  if (process.env.HUNTER_API_KEY) providers.push(hunterEnricher);
  if (process.env.APOLLO_API_KEY) providers.push(apolloEnricher);
  if (hasAi) providers.push(claudeEnricher);
  return providers.length ? createWaterfall(providers) : null;
}

export function buildAccountWaterfall(hasAi: boolean) {
  if (!hasAi) return null;
  return createWaterfall([claudeEnricher]);
}
