"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import ConnectionsHub from "@/components/ConnectionsHub";

const ERROR_MESSAGES: Record<string, string> = {
  supabase_not_configured: "Supabase is niet geconfigureerd op de server.",
  oauth_failed: "OAuth login mislukt.",
  missing_code: "OAuth antwoord incompleet.",
  invalid_state: "OAuth sessie verlopen — probeer opnieuw.",
  state_expired: "OAuth sessie verlopen — probeer opnieuw.",
  token_exchange_failed: "Token uitwisseling mislukt. Controleer CLIENT_ID/SECRET op Vercel.",
  workspace_not_found: "Workspace niet gevonden in Supabase. Run supabase/schema.sql.",
  config_save_failed: "Token kon niet worden opgeslagen.",
};

export default function IntegrationsPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const errDetail = searchParams.get("error_detail");
    const oauthSuccess = searchParams.get("oauth_success");
    if (oauthSuccess) {
      setBanner({ type: "ok", text: `${oauthSuccess} verbonden via OAuth.` });
    } else if (err) {
      setBanner({
        type: "err",
        text: errDetail ?? ERROR_MESSAGES[err] ?? `Fout: ${err}`,
      });
    }
  }, [searchParams]);

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <div className="page-loading">Redirecting…</div>;

  const workspaceId = user.workspaceId ?? "legacy-scale-models";

  return (
    <div className="integrations-page">
      <header className="integrations-page-head">
        <h1>Integrations</h1>
        <p>
          Connect your workspace in four steps: AI for smart columns, CRM for sync, enrichment APIs
          for data, and MCP for agent actions.
        </p>
      </header>
      {banner && (
        <div className={`integrations-banner integrations-banner-${banner.type}`}>
          {banner.text}
          <button type="button" onClick={() => setBanner(null)} aria-label="Sluiten">
            ×
          </button>
        </div>
      )}
      <ConnectionsHub workspaceId={workspaceId} focusProvider={focus} />
    </div>
  );
}
