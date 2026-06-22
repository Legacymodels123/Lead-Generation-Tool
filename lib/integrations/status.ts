import type { WorkspaceConfig } from "@/lib/types";

/** Masked keys from GET ?mask=1 must never be saved back */
export function isMaskedSecret(value: string): boolean {
  return /[•*]/.test(value) || value === "***";
}

export function isApiKeyConfigured(value: string | undefined): boolean {
  if (!value || !value.trim()) return false;
  if (isMaskedSecret(value)) return true;
  return value.trim().length >= 8;
}

type OAuthEntry = { accessToken?: string; connectedAt?: string };

function oauthEntry(config: WorkspaceConfig, provider: string): OAuthEntry | undefined {
  const oauth = config.oauth as Record<string, OAuthEntry> | undefined;
  return oauth?.[provider];
}

/** Whether an integration appears connected (API key or OAuth). Works with masked config from client. */
export function isIntegrationConnected(config: WorkspaceConfig, id: string): boolean {
  const keys = config.apiKeys ?? {};

  switch (id) {
    case "openai":
      return isApiKeyConfigured(keys.openai);
    case "anthropic":
      return isApiKeyConfigured(keys.anthropic);
    case "hubspot":
      return (
        isApiKeyConfigured(keys.hubspot) ||
        Boolean(oauthEntry(config, "hubspot_oauth")?.accessToken) ||
        Boolean(oauthEntry(config, "hubspot")?.accessToken)
      );
    case "linkedin":
      return (
        isApiKeyConfigured(keys.linkedin) ||
        Boolean(oauthEntry(config, "linkedin")?.accessToken)
      );
    case "hunter":
      return isApiKeyConfigured(keys.hunter);
    case "apollo":
      return isApiKeyConfigured(keys.apollo);
    case "instantly":
      return isApiKeyConfigured(keys.instantly);
    default:
      return isApiKeyConfigured((keys as Record<string, string | undefined>)[id]);
  }
}

export function integrationConnectionSource(
  config: WorkspaceConfig,
  id: string
): "api_key" | "oauth" | null {
  if (id === "hubspot") {
    if (oauthEntry(config, "hubspot_oauth")?.accessToken || oauthEntry(config, "hubspot")?.accessToken) {
      return "oauth";
    }
  }
  if (id === "linkedin" && oauthEntry(config, "linkedin")?.accessToken) {
    return "oauth";
  }
  const keys = config.apiKeys ?? {};
  const key = (keys as Record<string, string | undefined>)[id];
  if (isApiKeyConfigured(key) && key && !isMaskedSecret(key)) return "api_key";
  if (isApiKeyConfigured(key)) return "api_key";
  return null;
}

export function mergeApiKeysPatch(
  current: WorkspaceConfig["apiKeys"] = {},
  patch: NonNullable<WorkspaceConfig["apiKeys"]>
): NonNullable<WorkspaceConfig["apiKeys"]> {
  const merged = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed || isMaskedSecret(trimmed)) continue;
    (merged as Record<string, string>)[k] = trimmed;
  }
  return merged;
}
