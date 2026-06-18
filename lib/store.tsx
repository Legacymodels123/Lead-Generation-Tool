"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { WORKFLOW_PRESETS } from "./automation/presets";
import type { Batch, Contact, Lead } from "./types";
import type { AiColumnKey } from "./types/automation";
import { fitScore } from "./utils";
import { updateContactInLead } from "./utils/contacts";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  updateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
  toggleExpand: (id: string) => void;
  addLead: (lead: Omit<Lead, "id" | "workspaceId">) => Promise<string | null>;
  addQuickRow: () => Promise<void>;
  refetchLeads: () => Promise<void>;
  recalculateScores: (ids: string[]) => Promise<string | null>;
  enrichLeads: (ids: string[]) => Promise<string | null>;
  runAiColumns: (ids: string[], columns: AiColumnKey[]) => Promise<string | null>;
  syncHubSpot: (ids: string[]) => Promise<string | null>;
  pushInstantly: (ids: string[]) => Promise<string | null>;
  runWorkflow: (presetId: string, ids: string[]) => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const authHeaders = useCallback((): HeadersInit | undefined => {
    if (!token) return undefined;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const refetchLeads = useCallback(async () => {
    if (!token) {
      setLeads([]);
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      showToast("Failed to load leads");
    }
  }, [token, showToast]);

  useEffect(() => {
    refetchLeads();
  }, [token, refetchLeads]);

  const updateLead = useCallback(
    async (id: string, updates: Partial<Lead>) => {
      if (!token) return;

      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
      );

      try {
        const response = await fetch("/api/leads", {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ leadId: id, ...updates }),
        });

        if (!response.ok) {
          showToast("Failed to update lead");
          await refetchLeads();
        }
      } catch (error) {
        console.error("Failed to update lead:", error);
        showToast("Error updating lead");
        await refetchLeads();
      }
    },
    [token, authHeaders, showToast, refetchLeads]
  );

  const updateContact = useCallback(
    (leadId: string, contactId: string, updates: Partial<Contact>) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      const next = updateContactInLead(lead, contactId, updates);
      updateLead(leadId, { contacts: next.contacts });
    },
    [leads, updateLead]
  );

  const toggleExpand = useCallback((id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, expanded: !l.expanded } : l))
    );
  }, []);

  const addLead = useCallback(
    async (lead: Omit<Lead, "id" | "workspaceId">) => {
      if (!token) {
        showToast("Not authenticated");
        return null;
      }

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(lead),
        });

        if (response.ok) {
          const data = await response.json();
          setLeads((prev) => [data.lead, ...prev]);
          showToast("Lead created");
          return data.lead.id as string;
        }
        showToast("Failed to create lead");
        return null;
      } catch (error) {
        console.error("Failed to create lead:", error);
        showToast("Error creating lead");
        return null;
      }
    },
    [token, authHeaders, showToast]
  );

  const addQuickRow = useCallback(async () => {
    await addLead({
      company: "",
      country: "",
      market: "",
      employees: 0,
      revenue: "",
      sector: "",
      fitReason: "",
      website: "",
      linkedinCompanyUrl: "",
      contactName: "",
      contactTitle: "",
      linkedinUrl: "",
      status: "not_qualified",
      batch: "manual",
      isNew: true,
      notes: "",
      message: "",
      contacts: [],
    });
  }, [addLead]);

  const recalculateScores = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        const lead = leads.find((l) => l.id === id);
        if (!lead) continue;
        await updateLead(id, { score: fitScore(lead) });
      }
      showToast(`Score updated for ${ids.length} lead(s)`);
      return null;
    },
    [leads, updateLead, showToast]
  );

  const enrichLeads = useCallback(
    async (ids: string[]) => {
      if (!token) return "Not authenticated";

      let ok = 0;
      for (const leadId of ids) {
        try {
          const response = await fetch("/api/leads/enrich", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ leadId }),
          });
          if (response.ok) {
            const data = await response.json();
            setLeads((prev) =>
              prev.map((l) => (l.id === leadId ? data.lead : l))
            );
            ok++;
          }
        } catch {
          /* continue */
        }
      }
      showToast(ok ? `Enriched ${ok} lead(s)` : "Enrichment failed");
      return ok ? null : "Enrichment failed";
    },
    [token, authHeaders, showToast]
  );

  const runAiColumns = useCallback(
    async (ids: string[], columns: AiColumnKey[]) => {
      for (const id of ids) {
        const lead = leads.find((l) => l.id === id);
        if (!lead) continue;
        const patch: Partial<Lead> = { aiStatus: "done" };
        if (columns.includes("aiMessage")) {
          patch.aiMessage =
            lead.aiMessage ||
            `Hi ${lead.contactName || "there"},\n\nI wanted to reach out about a partnership with ${lead.company}.\n\nBest regards`;
        }
        if (columns.includes("aiSummary")) {
          patch.aiSummary =
            lead.aiSummary ||
            `${lead.company} operates in ${lead.sector || "agri"} (${lead.country}).`;
        }
        if (columns.includes("aiNextStep")) {
          patch.aiNextStep = lead.aiNextStep || "Schedule intro call within 5 business days.";
        }
        await updateLead(id, patch);
      }
      showToast(`AI columns generated for ${ids.length} lead(s)`);
      return null;
    },
    [leads, updateLead, showToast]
  );

  const syncHubSpot = useCallback(
    async (ids: string[]) => {
      if (!token) return "Not authenticated";
      try {
        const response = await fetch("/api/hubspot/sync", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ leadIds: ids, leads }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return (data.error as string) || "HubSpot sync failed";
        }
        showToast(`Synced ${ids.length} lead(s) to HubSpot`);
        return null;
      } catch {
        return "HubSpot sync failed";
      }
    },
    [token, authHeaders, leads, showToast]
  );

  const pushInstantly = useCallback(
    async (ids: string[]) => {
      if (!token) return "Not authenticated";
      try {
        const response = await fetch("/api/integrations/instantly", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ leadIds: ids, campaignId: "default", leads }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return (data.error as string) || "Instantly push failed";
        }
        showToast(`Pushed ${ids.length} lead(s) to Instantly`);
        return null;
      } catch {
        return "Instantly push failed";
      }
    },
    [token, authHeaders, leads, showToast]
  );

  const runWorkflow = useCallback(
    async (presetId: string, ids: string[]) => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === presetId);
      if (!preset) return "Unknown workflow";

      for (const step of preset.steps) {
        if (step.type === "enrich") {
          const err = await enrichLeads(ids);
          if (err) return err;
        } else if (step.type === "score") {
          const err = await recalculateScores(ids);
          if (err) return err;
        } else if (step.type === "ai") {
          const err = await runAiColumns(ids, step.columns ?? ["aiMessage", "aiSummary", "aiNextStep"]);
          if (err) return err;
        } else if (step.type === "hubspot") {
          const err = await syncHubSpot(ids);
          if (err) return err;
        }
      }
      showToast(`Workflow "${preset.label}" completed`);
      return null;
    },
    [enrichLeads, recalculateScores, runAiColumns, syncHubSpot, showToast]
  );

  return (
    <AppContext.Provider
      value={{
        leads,
        batches,
        toast,
        showToast,
        updateLead,
        updateContact,
        toggleExpand,
        addLead,
        addQuickRow,
        refetchLeads,
        recalculateScores,
        enrichLeads,
        runAiColumns,
        syncHubSpot,
        pushInstantly,
        runWorkflow,
      }}
    >
      {children}
      {toast && <div className="toast">{toast}</div>}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
