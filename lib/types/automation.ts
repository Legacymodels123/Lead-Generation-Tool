export type AiColumnKey = "aiMessage" | "aiSummary" | "aiNextStep";

export type AiStatus = "idle" | "running" | "done" | "error";

export const AI_COLUMNS: {
  key: AiColumnKey;
  label: string;
  dbField: "ai_message" | "ai_summary" | "ai_next_step";
}[] = [
  { key: "aiMessage", label: "AI Bericht", dbField: "ai_message" },
  { key: "aiSummary", label: "AI Samenvatting", dbField: "ai_summary" },
  { key: "aiNextStep", label: "Volgende stap", dbField: "ai_next_step" },
];

export const DEFAULT_AI_COLUMNS: AiColumnKey[] = ["aiMessage", "aiSummary", "aiNextStep"];
