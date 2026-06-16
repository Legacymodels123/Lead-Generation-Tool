"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { LEGACY_SCALE_MODELS_ICP } from "@/lib/icp/legacy-scale-models";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FindLeadsViaAiModal({ isOpen, onClose, onSuccess }: Props) {
  const { workspaceId, showToast, addCredits } = useApp();
  const [market, setMarket] = useState("Technology");
  const [sector, setSector] = useState("Software");
  const [companySize, setCompanySize] = useState<"small" | "medium" | "large">("medium");
  const [country, setCountry] = useState("Nederland");
  const [fitCriteria, setFitCriteria] = useState("Growing companies with expansion potential");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const icp = LEGACY_SCALE_MODELS_ICP;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/leads/find-via-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          market,
          sector,
          companySize,
          country,
          fitCriteria,
          count,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate leads");
      }

      const result = await response.json();
      const creditsUsed = count * 3; // 3 credits per lead
      addCredits(-creditsUsed, `AI leads gegenereerd: ${result.count} leads`);

      showToast(`✓ ${result.count} leads gegenereerd!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      showToast("✗ " + msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div className="modal">
        <div className="modal-header">
          <h2>AI Leads Zoeken</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Markt</label>
              <select
                className="form-input"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              >
                {icp.markets.map((m) => (
                  <option key={m.label} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sector</label>
              <input
                className="form-input"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="bijv. Software, Manufacturing"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bedrijfsgrootte</label>
              <select
                className="form-input"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value as "small" | "medium" | "large")}
              >
                <option value="small">Klein (50 werknemers)</option>
                <option value="medium">Gemiddeld (250 werknemers)</option>
                <option value="large">Groot (1000+ werknemers)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Land</label>
              <select
                className="form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="Nederland">Nederland</option>
                <option value="België">België</option>
                <option value="Duitsland">Duitsland</option>
                <option value="Noorwegen">Noorwegen</option>
                <option value="Portugal">Portugal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ICP fit criteria</label>
              <textarea
                className="form-input"
                value={fitCriteria}
                onChange={(e) => setFitCriteria(e.target.value)}
                placeholder="Omschrijf wat je zoekt..."
                style={{ minHeight: 80 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Aantal leads (1-20)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                Kosten: {count * 3} credits ({count} × 3 credits per lead)
              </p>
            </div>

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Leads genereren..." : "Zoeken"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
