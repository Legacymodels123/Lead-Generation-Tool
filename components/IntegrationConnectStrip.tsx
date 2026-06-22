"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderId = "openai" | "anthropic" | "hubspot" | "linkedin";

interface ProviderMeta {
  id: ProviderId;
  name: string;
  tagline: string;
  accent: string;
  glyph: string;
  oauth?: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    name: "ChatGPT",
    tagline: "AI columns & enrichment",
    accent: "integration-openai",
    glyph: "◆",
  },
  {
    id: "anthropic",
    name: "Claude",
    tagline: "Research & outreach copy",
    accent: "integration-anthropic",
    glyph: "✦",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    tagline: "Sync companies & contacts",
    accent: "integration-hubspot",
    glyph: "⬡",
    oauth: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    tagline: "Import & profile data",
    accent: "integration-linkedin",
    glyph: "in",
    oauth: true,
  },
];

interface Props {
  workspaceId: string;
  compact?: boolean;
}

export default function IntegrationConnectStrip({ workspaceId, compact = false }: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState<Record<ProviderId, boolean>>({
    openai: false,
    anthropic: false,
    hubspot: false,
    linkedin: false,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        apiKeys?: Partial<Record<ProviderId, string>>;
        oauth?: Partial<Record<string, boolean>>;
      };
      setConnected({
        openai: Boolean(data.apiKeys?.openai),
        anthropic: Boolean(data.apiKeys?.anthropic),
        hubspot: Boolean(data.apiKeys?.hubspot || data.oauth?.hubspot),
        linkedin: Boolean(data.oauth?.linkedin),
      });
    } catch {
      /* ignore */
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleConnect(provider: ProviderMeta) {
    if (provider.oauth && (provider.id === "linkedin" || provider.id === "hubspot")) {
      const oauthProvider = provider.id === "hubspot" ? "hubspot_oauth" : "linkedin";
      window.location.href = `/api/oauth/authorize?provider=${oauthProvider}&workspace_id=${encodeURIComponent(workspaceId)}&redirect_to=${encodeURIComponent("/integrations")}`;
      return;
    }
    router.push(`/integrations?focus=${provider.id}`);
  }

  return (
    <div className={`integration-strip${compact ? " integration-strip-compact" : ""}`}>
      {PROVIDERS.map((p) => {
        const isOn = connected[p.id];
        return (
          <button
            key={p.id}
            type="button"
            className={`integration-card ${p.accent}${isOn ? " connected" : ""}`}
            onClick={() => handleConnect(p)}
            title={isOn ? `${p.name} connected` : `Connect ${p.name}`}
          >
            <span className="integration-card-glyph" aria-hidden>
              {p.glyph}
            </span>
            <span className="integration-card-body">
              <span className="integration-card-name">{p.name}</span>
              {!compact && <span className="integration-card-tag">{p.tagline}</span>}
            </span>
            <span className={`integration-card-status${isOn ? " on" : ""}`}>
              {isOn ? "●" : "○"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
