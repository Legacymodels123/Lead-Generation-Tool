"use client";

import { useCallback, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { findDuplicateCompanies, parseLinkedInCSV } from "@/lib/utils/csv-parser";

interface Props {
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function LinkedInImport({ onClose }: Props) {
  const { addLead, leads } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<Partial<Lead>[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [importIndex, setImportIndex] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("Kies een .csv bestand");
        return;
      }
      try {
        const rows = await parseLinkedInCSV(file);
        if (rows.length === 0) {
          alert(
            "Geen leads gevonden in dit bestand. Controleer of het een LinkedIn Sales Navigator export is."
          );
          return;
        }
        setParsed(rows);
        setDuplicates(findDuplicateCompanies(rows, leads));
        setStep("preview");
      } catch {
        alert("Kon het bestand niet lezen. Probeer opnieuw.");
      }
    },
    [leads]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = useCallback(async () => {
    setStep("importing");
    setImportIndex(0);

    const errs: string[] = [];
    let count = 0;

    for (let i = 0; i < parsed.length; i++) {
      const lead = parsed[i];
      setImportIndex(i + 1);

      const error = await addLead({
        company: lead.company!,
        country: lead.country ?? "Nederland",
        market: lead.sector?.includes("Agri") ? "Agri Machinery" : lead.sector ?? "",
        employees: lead.employees ?? 0,
        revenue: lead.revenue ?? "",
        sector: lead.sector ?? "",
        fitReason: "",
        website: "",
        linkedinCompanyUrl: lead.linkedinUrl ?? "",
        contactName: lead.contactName!,
        contactTitle: lead.contactTitle ?? "",
        linkedinUrl: lead.linkedinUrl ?? "",
        status: lead.status ?? "nieuw",
        notes: lead.notes ?? "Geïmporteerd via LinkedIn Sales Navigator CSV",
        message: lead.message ?? "",
      });

      if (error) {
        errs.push(`${lead.company}: ${error}`);
      } else {
        count++;
      }
    }

    setImported(count);
    setErrors(errs);
    setStep("done");
  }, [parsed, addLead]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="modal-title">LinkedIn Sales Navigator importeren</div>

        {step === "upload" && (
          <div style={{ padding: "8px 0 0" }}>
            <p className="card-desc" style={{ marginBottom: 16 }}>
              Exporteer je leads vanuit Sales Navigator:{" "}
              <strong>Leads lijst → Export → CSV</strong>
            </p>
            <div
              className={`csv-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Sleep je CSV hier naartoe
              </div>
              <div style={{ color: "#999", fontSize: 13 }}>
                of klik om een bestand te kiezen
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
        )}

        {step === "preview" && (
          <>
            <p className="card-desc" style={{ margin: "12px 0" }}>
              <strong>{parsed.length} leads</strong> gevonden. Controleer en klik
              op Importeren.
            </p>
            {duplicates.length > 0 && (
              <div className="import-warning">
                <strong>Let op:</strong> {duplicates.length} dubbele bedrijfsnamen
                gevonden ({duplicates.slice(0, 3).join(", ")}
                {duplicates.length > 3 ? ", …" : ""}). Deze worden toch
                geïmporteerd.
              </div>
            )}
            <div className="import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Bedrijf</th>
                    <th>Contact</th>
                    <th>Sector</th>
                    <th>Land</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((lead, i) => (
                    <tr key={i}>
                      <td>{lead.company}</td>
                      <td>{lead.contactName}</td>
                      <td>{lead.sector || "—"}</td>
                      <td>{lead.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("upload")}
              >
                Terug
              </button>
              <button type="button" className="btn-primary" onClick={handleImport}>
                {parsed.length} leads importeren
              </button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              Importeren {importIndex} van {parsed.length}...
            </div>
            <div className="import-progress">
              <div
                style={{
                  width: `${Math.round((importIndex / parsed.length) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding: "8px 0 0" }}>
            <p style={{ textAlign: "center", fontWeight: 600, marginBottom: 12 }}>
              {imported} leads geïmporteerd
            </p>
            {errors.length > 0 && (
              <div className="form-error" style={{ marginBottom: 12 }}>
                {errors.slice(0, 5).map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={onClose}>
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}