"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { CREDIT_COSTS, NIGHTLY_BATCH_LEADS } from "@/lib/types";

export default function BatchesPage() {
  const { batches, runNightlyBatch, leads } = useApp();
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [lastSource, setLastSource] = useState<string | null>(null);

  const batchCost = CREDIT_COSTS.nightlyBatch * NIGHTLY_BATCH_LEADS;
  const recentBatches = batches.slice(0, 5);
  const newLeadsCount = leads.filter((l) => l.isNew).length;

  async function handleRunBatch() {
    setError("");
    setRunning(true);
    setLastSource(null);
    const err = await runNightlyBatch();
    if (err) {
      setError(err);
    } else {
      setLastSource("Batch voltooid — bekijk nieuwe leads op de leads pagina");
    }
    setRunning(false);
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Batches</span>
        <span className="topbar-sub">— AI lead generatie</span>
        <div className="topbar-spacer" />
        <button
          className="btn-primary"
          type="button"
          onClick={handleRunBatch}
          disabled={!user || user.credits < batchCost || running}
        >
          {running ? "Batch draait…" : `▶ Run batch (${batchCost} credits)`}
        </button>
      </div>
      <div className="page-scroll">
        <div className="card">
          <div className="card-title">Lead generatie agent</div>
          <div className="card-desc">
            Genereert {NIGHTLY_BATCH_LEADS} nieuwe leads per batch via AI (OpenAI of Claude) of
            smart templates als fallback. Leads zijn AI-gegenereerd op basis van marktpatronen — geen
            live web scraping. Kost {CREDIT_COSTS.nightlyBatch} credits per lead (
            {batchCost} credits totaal). Je hebt {user?.credits ?? 0} credits.
          </div>
          {error && <div className="form-error">{error}</div>}
          {lastSource && (
            <div className="batch-success-banner">
              {lastSource}{" "}
              <Link href="/leads" className="batch-link">
                → Naar leads ({newLeadsCount} nieuw)
              </Link>
            </div>
          )}
          {running && (
            <div className="batch-progress">
              <span className="ai-spinner" /> Leads worden gegenereerd…
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Laatste batches</div>
          <div className="card-desc">Laatste 5 batch runs met bron en resultaat</div>
          <div className="batch-list">
            {recentBatches.length === 0 && (
              <p style={{ fontSize: 13, color: "#bbb" }}>
                Nog geen batches uitgevoerd. Klik op Run batch om te starten.
              </p>
            )}
            {recentBatches.map((batch) => (
              <div key={batch.id} className="batch-item">
                <div className="batch-item-date">
                  {new Date(batch.createdAt).toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="batch-item-meta">
                  {batch.label} · {batch.creditsUsed} credits
                </div>
                <div className="batch-item-count">{batch.leadCount} leads toegevoegd</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
