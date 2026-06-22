"use client";

import type { CustomColumnType } from "@/lib/types";

const OPTIONS: { type: CustomColumnType; title: string; desc: string; icon: string }[] = [
  {
    type: "text",
    title: "Text property",
    desc: "Single-line field you can edit per company",
    icon: "Aa",
  },
  {
    type: "select",
    title: "Dropdown",
    desc: "Pick from a fixed list of options",
    icon: "▾",
  },
  {
    type: "ai_enriched",
    title: "AI property",
    desc: "Auto-fill with ChatGPT or Claude using a prompt",
    icon: "✦",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (type: CustomColumnType) => void;
}

export default function PropertyCreatorModal({ open, onClose, onPick }: Props) {
  if (!open) return null;

  return (
    <div className="property-creator-overlay" onClick={onClose} role="presentation">
      <div
        className="property-creator-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="property-creator-title"
      >
        <div className="property-creator-head">
          <h2 id="property-creator-title">Add property</h2>
          <p>Choose a column type for your spreadsheet</p>
          <button type="button" className="property-creator-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="property-creator-grid">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className="property-creator-option"
              onClick={() => {
                onPick(opt.type);
                onClose();
              }}
            >
              <span className="property-creator-icon">{opt.icon}</span>
              <strong>{opt.title}</strong>
              <span>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
