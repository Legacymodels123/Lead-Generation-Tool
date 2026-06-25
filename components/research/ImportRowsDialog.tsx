"use client";

import { useMemo, useState } from "react";

export default function ImportRowsDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Array<{ companyName: string; domain: string; country?: string; city?: string }>) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [companyName = "", domain = "", country = "", city = ""] = line.split(",").map((part) => part.trim());
        return { companyName, domain, country, city };
      })
      .filter((row) => row.companyName);
  }, [value]);

  if (!open) return null;

  return (
    <div className="research-modal-backdrop">
      <div className="research-modal">
        <div className="research-modal-head">
          <div>
            <h3>Import company rows</h3>
            <p>Paste CSV-style lines: `company, domain, country, city`.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <textarea
          className="research-import-textarea"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={"Acme, acme.com, Netherlands, Amsterdam\nNorthFleet, northfleet.io, Germany, Berlin"}
        />

        <div className="research-import-meta">
          <span>{parsed.length} rows ready</span>
          <button
            type="button"
            className="research-primary-btn"
            disabled={!parsed.length || submitting}
            onClick={async () => {
              setSubmitting(true);
              await onImport(parsed);
              setSubmitting(false);
              setValue("");
              onClose();
            }}
          >
            {submitting ? "Importing..." : "Import rows"}
          </button>
        </div>
      </div>
    </div>
  );
}
