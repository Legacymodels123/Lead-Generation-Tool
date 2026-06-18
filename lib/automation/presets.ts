import type { AiColumnKey } from "@/lib/types/automation";

export type WorkflowStep =
  | { type: "enrich" }
  | { type: "score" }
  | { type: "ai"; columns?: AiColumnKey[] }
  | { type: "hubspot" };

export interface WorkflowPreset {
  id: string;
  label: string;
  description: string;
  steps: WorkflowStep[];
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: "na-import",
    label: "Na import",
    description: "Verrijk → score → AI kolommen",
    steps: [{ type: "enrich" }, { type: "score" }, { type: "ai" }],
  },
  {
    id: "outbound-ready",
    label: "Outbound ready",
    description: "Verrijk → AI bericht → HubSpot",
    steps: [
      { type: "enrich" },
      { type: "ai", columns: ["aiMessage"] },
      { type: "hubspot" },
    ],
  },
  {
    id: "score-only",
    label: "Score herberekenen",
    description: "Alleen fit score",
    steps: [{ type: "score" }],
  },
];

export const PRESET_NA_IMPORT = WORKFLOW_PRESETS[0];
