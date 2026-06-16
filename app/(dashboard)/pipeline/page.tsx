"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import { scoreColor } from "@/lib/utils";

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "not_qualified", label: "Niet gekwalificeerd", color: "#ef4444" },
  { status: "qualified", label: "Gekwalificeerd", color: "#22c55e" },
];

export default function PipelinePage() {
  const { leads, updateLead } = useApp();
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, typeof leads> = {
      qualified: [],
      not_qualified: [],
    };
    leads.forEach((l) => map[l.status].push(l));
    return map;
  }, [leads]);

  function handleDrop(status: LeadStatus) {
    if (!dragId) return;
    updateLead(dragId, { status, isNew: false });
    setDragId(null);
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Pipeline</span>
        <span className="topbar-sub">— Drag & drop status wijzigen</span>
      </div>
      <div className="page-scroll">
        <div className="kanban">
          {COLUMNS.map((col) => (
            <div
              key={col.status}
              className="kanban-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="kanban-col-header">
                <span style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-count">{grouped[col.status].length}</span>
              </div>
              {grouped[col.status].map((lead) => (
                <div
                  key={lead.id}
                  className="kanban-card"
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onClick={() => router.push(`/leads?selected=${lead.id}`)}
                >
                  <div className="kanban-company">{lead.company}</div>
                  <div className="kanban-contact">{lead.contactName}</div>
                  <div className="kanban-score" style={{ color: scoreColor(lead.score ?? 0) }}>
                    Fit {lead.score}%
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
