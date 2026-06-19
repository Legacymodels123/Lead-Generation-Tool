"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "openai" | "anthropic";

const CONFIG: Record<
  Provider,
  { label: string; connectLabel: string; iconClass: string; glyph: string }
> = {
  openai: {
    label: "OpenAI",
    connectLabel: "Connect to ChatGPT",
    iconClass: "ai-connect-icon-openai",
    glyph: "◆",
  },
  anthropic: {
    label: "Claude",
    connectLabel: "Connect to Claude",
    iconClass: "ai-connect-icon-anthropic",
    glyph: "✦",
  },
};

interface Props {
  workspaceId: string;
  provider: Provider;
}

export default function AiConnectButton({ workspaceId, provider }: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const meta = CONFIG[provider];

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`);
      if (!res.ok) return;
      const data = (await res.json()) as { apiKeys?: { openai?: string; anthropic?: string } };
      setConnected(Boolean(data.apiKeys?.[provider]));
    } catch {
      /* ignore */
    }
  }, [workspaceId, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <button
      type="button"
      className={`ai-connect-btn${connected ? " connected" : ""}`}
      onClick={() => router.push("/integrations")}
      title={connected ? `${meta.label} connected` : meta.connectLabel}
    >
      <span className={`ai-connect-icon ${meta.iconClass}`} aria-hidden>
        {meta.glyph}
      </span>
      <span>{connected ? `${meta.label} connected` : meta.connectLabel}</span>
    </button>
  );
}
