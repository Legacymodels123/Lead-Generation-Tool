"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { createCustomColumnClient } from "@/lib/custom-columns-client";
import { customColumnGridId } from "@/lib/merge-grid-columns";
import {
  applyColumnMappings,
  buildImportFieldOptions,
  collectNewProperties,
  countMapped,
  countNewProperties,
  getMappingDisplayLabel,
  resolveMappingsAfterCreate,
  suggestColumnMappings,
  type ColumnMapping,
  type ImportTargetId,
} from "@/lib/import/field-mapping";
import { parseCsvFile, sampleValues, type ParsedCsv } from "@/lib/import/parse-csv";
import { findDuplicateCompanies } from "@/lib/utils/csv-parser";
import type { CustomColumn } from "@/lib/types";
import { defaultContactsForAccount } from "@/lib/utils/contacts";

interface Props {
  onClose: () => void;
  workspaceId: string;
  token: string | null;
  customColumns: CustomColumn[];
  onCustomColumnsChange: (columns: CustomColumn[]) => void;
  onAddVisibleColumn?: (colId: string) => void;
}

type Step = "upload" | "map" | "importing" | "done";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function CsvImportModal({
  onClose,
  workspaceId,
  token,
  customColumns,
  onCustomColumnsChange,
  onAddVisibleColumn,
}: Props) {
  const { addLead, leads } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [importIndex, setImportIndex] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [createdFields, setCreatedFields] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  const fieldOptions = useMemo(
    () => buildImportFieldOptions(customColumns),
    [customColumns]
  );

  const mappedCount = useMemo(() => countMapped(mappings), [mappings]);
  const newFieldCount = useMemo(() => countNewProperties(mappings), [mappings]);
  const rowCount = csv?.rows.length ?? 0;

  const resetFile = useCallback(() => {
    setCsv(null);
    setMappings([]);
    setFileName("");
    setFileSize(0);
    setStep("upload");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".tsv") && !lower.endsWith(".txt")) {
        alert("Choose a CSV file (.csv)");
        return;
      }
      try {
        const data = await parseCsvFile(file);
        if (data.headers.length === 0 || data.rows.length === 0) {
          alert("No data rows found in this file.");
          return;
        }
        setFileName(file.name);
        setFileSize(file.size);
        setCsv(data);
        setMappings(suggestColumnMappings(data.headers, customColumns, autoCreate));
        setStep("map");
      } catch {
        alert("Could not read the file. Try again.");
      }
    },
    [customColumns, autoCreate]
  );

  const updateMapping = useCallback((csvHeader: string, target: ImportTargetId) => {
    setEditingHeader(null);
    setMappings((prev) =>
      prev.map((m) =>
        m.csvHeader === csvHeader
          ? {
              ...m,
              target,
              newPropertyLabel:
                target === "new_property" ? m.newPropertyLabel ?? csvHeader : undefined,
            }
          : m
      )
    );
  }, []);

  const updateNewLabel = useCallback((csvHeader: string, label: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, newPropertyLabel: label } : m))
    );
  }, []);

  const rebuildSuggestions = useCallback(() => {
    if (!csv) return;
    setMappings(suggestColumnMappings(csv.headers, customColumns, autoCreate));
  }, [csv, customColumns, autoCreate]);

  const createSkippedAsNew = useCallback(() => {
    setMappings((prev) =>
      prev.map((m) =>
        m.target === "skip"
          ? { ...m, target: "new_property" as const, newPropertyLabel: m.csvHeader }
          : m
      )
    );
  }, []);

  const handleImport = useCallback(async () => {
    if (!csv) return;

    const hasCompany = mappings.some((m) => m.target === "company");
    if (!hasCompany) {
      alert("Map at least one column to Company before importing.");
      return;
    }

    const drafts = applyColumnMappings(csv, mappings);
    if (!drafts.length) {
      alert("No valid rows to import. Check your column mapping.");
      return;
    }

    const dupes = findDuplicateCompanies(
      drafts.map((d) => d.lead) as Parameters<typeof findDuplicateCompanies>[0],
      leads
    );
    if (dupes.length > 0) {
      const ok = confirm(
        `${dupes.length} duplicate company names found in this file. Import anyway?`
      );
      if (!ok) return;
    }

    setStep("importing");
    setImportIndex(0);
    setImportTotal(drafts.length);
    setCreatedFields(0);

    const errs: string[] = [];
    let count = 0;
    let fieldsCreated = 0;

    let resolvedMappings = [...mappings];
    const toCreate = collectNewProperties(resolvedMappings);
    const createdCols: CustomColumn[] = [];
    let columnsSnapshot = [...customColumns];

    for (const field of toCreate) {
      const created = await createCustomColumnClient(workspaceId, token, {
        label: field.label,
        type: "text",
      });
      if (created) {
        createdCols.push(created);
        columnsSnapshot = [...columnsSnapshot, created];
        fieldsCreated++;
        onAddVisibleColumn?.(customColumnGridId(created));
      } else {
        errs.push(`Could not create property "${field.label}"`);
      }
    }

    if (createdCols.length) {
      onCustomColumnsChange(columnsSnapshot);
      resolvedMappings = resolveMappingsAfterCreate(resolvedMappings, createdCols);
    }

    const finalDrafts = applyColumnMappings(csv, resolvedMappings);

    for (let i = 0; i < finalDrafts.length; i++) {
      const draft = finalDrafts[i].lead;
      setImportIndex(i + 1);

      const contactPatch = draft.contacts?.[0];
      const contacts = contactPatch
        ? defaultContactsForAccount({ id: "temp" }).map((c, idx) =>
            idx === 0
              ? {
                  ...c,
                  name: contactPatch.name || draft.contactName || "",
                  title: contactPatch.title || draft.contactTitle || "",
                  email: contactPatch.email || "",
                  phone: contactPatch.phone || "",
                  linkedinUrl: contactPatch.linkedinUrl || draft.linkedinUrl || "",
                }
              : c
          )
        : defaultContactsForAccount({ id: "temp" });

      const leadId = await addLead({
        company: draft.company!,
        city: draft.city ?? "",
        country: draft.country ?? "Nederland",
        market: draft.market ?? "",
        employees: draft.employees ?? 0,
        revenue: draft.revenue ?? "",
        sector: draft.sector ?? "",
        fitReason: draft.fitReason ?? "",
        website: draft.website ?? "",
        linkedinCompanyUrl: draft.linkedinCompanyUrl ?? "",
        contactName: draft.contactName ?? "Unknown",
        contactTitle: draft.contactTitle ?? "",
        linkedinUrl: draft.linkedinUrl ?? contactPatch?.linkedinUrl ?? "",
        status: draft.status ?? "not_qualified",
        notes: draft.notes ?? `Imported from ${fileName || "CSV"}`,
        message: draft.message ?? "",
        batch: draft.batch || "import-csv",
        isNew: true,
        contacts,
        score: 0,
        source: "linkedin_import",
        customValues: draft.customValues,
      });

      if (!leadId) {
        errs.push(`${draft.company}: import failed`);
      } else {
        count++;
      }
    }

    setImported(count);
    setCreatedFields(fieldsCreated);
    setErrors(errs);
    setStep("done");
  }, [
    csv,
    mappings,
    workspaceId,
    token,
    customColumns,
    onCustomColumnsChange,
    onAddVisibleColumn,
    addLead,
    fileName,
    leads,
  ]);

  return (
    <div className="modal-overlay import-overlay" onClick={onClose}>
      <div
        className="modal import-modal-v2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="import-modal-header">
          <h2 className="import-modal-title">Import CSV</h2>
          <button type="button" className="import-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {step === "upload" && (
          <div className="import-upload-body">
            <p className="import-upload-desc">
              Upload a CSV file. Columns are detected automatically so you can connect them to
              existing properties or create new ones.
            </p>
            <div
              className={`csv-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <div className="import-drop-title">Drop your CSV here</div>
              <div className="import-drop-sub">or click to browse</div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </div>
          </div>
        )}

        {step === "map" && csv && (
          <>
            <div className="import-file-bar">
              <div className="import-file-info">
                <span className="import-file-icon" aria-hidden>
                  📄
                </span>
                <span className="import-file-name">
                  {fileName}
                  <span className="import-file-size"> ({formatFileSize(fileSize)})</span>
                </span>
              </div>
              <div className="import-file-actions">
                <span className="import-header-row">Row 1</span>
                <button type="button" className="import-file-remove" onClick={resetFile}>
                  <span aria-hidden>🗑</span> Remove
                </button>
              </div>
            </div>

            <div className="import-map-head">
              <div className="import-map-head-left">
                <span className="import-map-col-label">CSV column</span>
                <span className="import-map-status">
                  {mappedCount} of {mappings.length} mapped
                </span>
              </div>
              <div className="import-map-head-right">
                <span className="import-map-col-label">Table column</span>
                <div className="import-map-tools">
                  {mappings.some((m) => m.target === "skip") && (
                    <button type="button" className="import-tool-btn" onClick={createSkippedAsNew}>
                      + Create {mappings.filter((m) => m.target === "skip").length} new field
                      {mappings.filter((m) => m.target === "skip").length === 1 ? "" : "s"}
                    </button>
                  )}
                  {newFieldCount > 0 && (
                    <span className="import-new-count">
                      {newFieldCount} new {newFieldCount === 1 ? "property" : "properties"}
                    </span>
                  )}
                  <button type="button" className="import-tool-btn" onClick={rebuildSuggestions}>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <label className="import-auto-create import-auto-create-inline">
              <input
                type="checkbox"
                checked={autoCreate}
                onChange={(e) => setAutoCreate(e.target.checked)}
              />
              Auto-map unrecognized columns to new properties
            </label>

            <div className="import-map-rows">
              {mappings.map((m) => {
                const sample = sampleValues(csv, m.csvHeader, 1)[0] ?? "";
                const label = getMappingDisplayLabel(m, fieldOptions);
                const isMapped = m.target !== "skip";

                return (
                  <div key={m.csvHeader} className="import-map-row">
                    <div className="import-csv-col">
                      <div className="import-csv-name">{m.csvHeader}</div>
                      <div className="import-csv-sample" title={sample}>
                        {sample || "—"}
                      </div>
                    </div>
                    <div className="import-table-col">
                      {isMapped && editingHeader !== m.csvHeader ? (
                        <div className="import-target-pill">
                          <span className="import-target-glyph">T</span>
                          {m.target === "new_property" ? (
                            <input
                              className="import-target-name-input"
                              value={m.newPropertyLabel ?? m.csvHeader}
                              onChange={(e) => updateNewLabel(m.csvHeader, e.target.value)}
                              onFocus={() => setEditingHeader(m.csvHeader)}
                            />
                          ) : (
                            <span className="import-target-name">{label}</span>
                          )}
                          <button
                            type="button"
                            className="import-target-clear"
                            onClick={() => updateMapping(m.csvHeader, "skip")}
                            aria-label="Clear mapping"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <select
                          className="import-target-select"
                          value={m.target}
                          onChange={(e) =>
                            updateMapping(m.csvHeader, e.target.value as ImportTargetId)
                          }
                        >
                          <option value="skip">Select property…</option>
                          {(["company", "contact", "custom"] as const).map((group) => {
                            const opts = fieldOptions.filter((o) => o.group === group);
                            if (!opts.length) return null;
                            const groupLabel =
                              group === "company"
                                ? "Company fields"
                                : group === "contact"
                                  ? "Contact fields"
                                  : "Properties";
                            return (
                              <optgroup key={group} label={groupLabel}>
                                {opts
                                  .filter((o) => o.id !== "skip")
                                  .map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="import-modal-footer">
              <button type="button" className="import-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="import-btn-primary"
                onClick={() => void handleImport()}
              >
                Import {rowCount} row{rowCount === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="import-progress-body">
            <p className="import-progress-label">
              Importing {importIndex} of {importTotal}…
            </p>
            <div className="import-progress">
              <div
                style={{
                  width: `${importTotal ? Math.round((importIndex / importTotal) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="import-done-body">
              <p className="import-done-title">{imported} rows imported</p>
              {createdFields > 0 && (
                <p className="import-done-sub">
                  {createdFields} new {createdFields === 1 ? "property" : "properties"} created
                </p>
              )}
              {errors.length > 0 && (
                <div className="form-error">
                  {errors.slice(0, 5).map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="import-modal-footer">
              <button type="button" className="import-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
