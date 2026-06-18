"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { CREDIT_COSTS } from "@/lib/types";

interface Props {
  onClose: () => void;
}

export default function AddLeadModal({ onClose }: Props) {
  const { addLead } = useApp();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: "",
    country: "Nederland",
    employees: 100,
    revenue: "€10M",
    sector: "Agri Dealer",
    contactName: "",
    contactTitle: "",
    linkedinUrl: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company || !form.contactName) {
      setError("Bedrijf en contactpersoon zijn verplicht.");
      return;
    }
    const leadId = await addLead({
      ...form,
      market: form.sector.includes("Agri") ? "Agri Machinery" : form.sector,
      fitReason: "",
      website: "",
      linkedinCompanyUrl: "",
      status: "not_qualified",
      notes: "",
      linkedinUrl: form.linkedinUrl || "https://linkedin.com",
      message:
        form.message ||
        `Hi ${form.contactName.split(" ")[0]}, ik ben Levi van Legacy Scale Models. We lanceren Universal Hobbies en Weise Toys — graag een korte kennismaking.`,
      batch: "manual",
      isNew: true,
      contacts: [],
      score: 0,
      source: "manual",
    });
    if (!leadId) setError("Kon lead niet toevoegen.");
    else onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Lead toevoegen</div>
        <p className="card-desc">Kost {CREDIT_COSTS.addLead} credits</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Bedrijf</label>
            <input
              className="form-input"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Land</label>
              <select
                className="form-input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                {["Nederland", "Duitsland", "België", "Noorwegen", "Portugal"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sector</label>
              <select
                className="form-input"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              >
                {[
                  "Agri Machinery",
                  "Agri Dealer",
                  "Agri Importer",
                  "Agri Manufacturer",
                  "Agri Trading",
                  "Dairy Equipment",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Contactpersoon</label>
              <input
                className="form-input"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Functie</label>
              <input
                className="form-input"
                value={form.contactTitle}
                onChange={(e) => setForm({ ...form, contactTitle: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">LinkedIn URL</label>
            <input
              className="form-input"
              value={form.linkedinUrl}
              onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuleren
            </button>
            <button type="submit" className="btn-primary">
              Toevoegen ({CREDIT_COSTS.addLead} credits)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
