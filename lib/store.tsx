"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { WORKFLOW_PRESETS } from "./automation/presets";
import type { Batch, Contact, CustomColumn, Lead } from "./types";
import { DEFAULT_WORKSPACE_ID } from "./types";
import type { AiColumnKey } from "./types/automation";
import { fitScore } from "./utils";
import { updateContactInLead } from "./utils/contacts";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  customColumns: CustomColumn[];
  toast: string | null;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>, immediate?: boolean) => void;
  updateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
  toggleExpand: (id: string) => void;
  addLead: (lead: Omit<Lead, "id" | "workspaceId">) => Promise<string | null>;
  addQuickRow: () => Promise<void>;
  refetchLeads: () => Promise<void>;
  refetchColumns: () => Promise<void>;
  deleteCustomColumn: (columnId: string) => Promise<void>;
  recalculateScores: (ids: string[]) => Promise<string | null>;
  enrichLeads: (ids: string[]) => Promise<string | null>;
  runAiColumns: (ids: string[], columns: AiColumnKey[]) => Promise<string | null>;
  runColumnAutomation: (column: CustomColumn, ids: string[]) => Promise<string | null>;
  researchWebsite: (ids: string[], columnKey?: string) => Promise<string | null>;
  syncHubSpot: (ids: string[]) => Promise<string | null>;
  pushInstantly: (ids: string[]) => Promise<string | null>;
  runWorkflow: (presetId: string, ids: string[]) => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const authHeaders = useCallback((): HeadersInit | undefined => {
    if (!token) return undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (user?.id) headers["x-user-id"] = user.id;
    if (user?.workspaceId) headers["x-workspace-id"] = user.workspaceId;
    else headers["x-workspace-id"] = DEFAULT_WORKSPACE_ID;
    return headers;
  }, [token, user?.id, user?.workspaceId]);

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

  const refetchColumns = useCallback(async () => {
    const workspaceId = user?.workspaceId ?? DEFAULT_WORKSPACE_ID;
    try {
      const response = await fetch(`/api/columns?workspaceId=${encodeURIComponent(workspaceId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setCustomColumns(data.custom || []);
      }
    } catch (error) {
      console.error("Failed to fetch columns:", error);
    }
  }, [token, user?.workspaceId]);

  useEffect(() => {
    refetchLeads();
    refetchColumns();
  }, [token, refetchLeads, refetchColumns]);

  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingUpdatesRef = useRef(new Map<string, Partial<Lead>>());

  const flushLeadSave = useCallback(
    async (id: string) => {
      if (!token) return;
      const updates = pendingUpdatesRef.current.get(id);
      if (!updates) return;
      pendingUpdatesRef.current.delete(id);

      try {
        const response = await fetch("/api/leads", {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ leadId: id, ...updates }),
        });
        if (!response.ok) {
          showToast("Failed to save");
          await refetchLeads();
        }
      } catch (error) {
        console.error("Failed to update lead:", error);
        showToast("Error saving");
        await refetchLeads();
      }
    },
    [token, authHeaders, showToast, refetchLeads]
  );

  const updateLead = useCallback(
    (id: string, updates: Partial<Lead>, immediate = false) => {
      if (!token) return;

      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
      );

      pendingUpdatesRef.current.set(id, {
        ...pendingUpdatesRef.current.get(id),
        ...updates,
      });

      const existing = saveTimersRef.current.get(id);
      if (existing) clearTimeout(existing);

      if (immediate) {
        void flushLeadSave(id);
        return;
      }

      saveTimersRef.current.set(
        id,
        setTimeout(() => {
          saveTimersRef.current.delete(id);
          void flushLeadSave(id);
        }, 300)
      );
    },
    [token, flushLeadSave]
  );

  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  const updateContact = useCallback(
    (leadId: string, contactId: string, updates: Partial<Contact>) => {
      const lead = leadsRef.current.find((l) => l.id === leadId);
      if (!lead) return;
      const next = updateContactInLead(lead, contactId, updates);
      updateLead(leadId, { contacts: next.contacts }, true);
    },
    [updateLead]
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

      for (const id of ids) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, aiStatus: "running" as const } : l))
        );
      }

      let ok = 0;
      for (const leadId of ids) {
        try {
          const response = await fetch("/api/leads/enrich", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ leadId, leads }),
          });
          if (response.ok) {
            const data = await response.json();
            setLeads((prev) =>
              prev.map((l) => (l.id === leadId ? data.lead : l))
            );
            ok++;
          } else {
            setLeads((prev) =>
              prev.map((l) => (l.id === leadId ? { ...l, aiStatus: "error" as const } : l))
            );
          }
        } catch {
          setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, aiStatus: "error" as const } : l))
          );
        }
      }
      showToast(ok ? `Enriched ${ok} lead(s)` : "Enrichment failed");
      return ok ? null : "Enrichment failed";
    },
    [token, authHeaders, showToast, leads]
  );

  const runAiColumns = useCallback(
    async (ids: string[], columns: AiColumnKey[]) => {
      if (!token) return "Not authenticated";

      for (const id of ids) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, aiStatus: "running" as const } : l))
        );
      }

      try {
        const response = await fetch("/api/automations/run", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ leadIds: ids, columns, leads }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return (data.error as string) || "AI generation failed";
        }
        const updated = (await response.json()) as Lead[];
        const byId = new Map(updated.map((l) => [l.id, l]));
        setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
        showToast(`AI columns generated for ${ids.length} lead(s)`);
        return null;
      } catch {
        return "AI generation failed";
      }
    },
    [token, authHeaders, leads, showToast]
  );

  const researchWebsite = useCallback(
    async (ids: string[], columnKey?: string) => {
      if (!token) return "Not authenticated";
      let ok = 0;
      for (const leadId of ids) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, aiStatus: "running" as const } : l))
        );
        try {
          const response = await fetch("/api/research/website", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              leadId,
              outputColumnKey: columnKey,
              leads,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
            ok++;
          }
        } catch {
          /* continue */
        }
      }
      showToast(ok ? `Researched ${ok} website(s)` : "Website research failed");
      return ok ? null : "Website research failed";
    },
    [token, authHeaders, leads, showToast]
  );

  const deleteCustomColumn = useCallback(
    async (columnId: string) => {
      try {
        const response = await fetch(`/api/columns/${columnId}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (response.ok) {
          await refetchColumns();
          showToast("Column deleted");
        }
      } catch {
        showToast("Failed to delete column");
      }
    },
    [authHeaders, refetchColumns, showToast]
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
        const data = await response.json();
        if (data.leads?.length) {
          const byId = new Map((data.leads as Lead[]).map((l) => [l.id, l]));
          setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
        }
        showToast(`Synced ${data.synced ?? ids.length} lead(s) to HubSpot`);
        return null;
      } catch {
        return "HubSpot sync failed";
      }
    },
    [token, authHeaders, leads, showToast]
  );

  const runColumnAutomation = useCallback(
    async (column: CustomColumn, ids: string[]) => {
      if (!column.automation) return null;
      const kind = column.automation.kind;

      if (kind === "enrich") return enrichLeads(ids);
      if (kind === "score") return recalculateScores(ids);
      if (kind === "hubspot") return syncHubSpot(ids);
      if (kind === "research") return researchWebsite(ids, column.key);

      if (kind === "ai") {
        if (!token) return "Not authenticated";
        for (const id of ids) {
          setLeads((prev) =>
            prev.map((l) => (l.id === id ? { ...l, aiStatus: "running" as const } : l))
          );
        }
        try {
          const response = await fetch("/api/automations/run", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              leadIds: ids,
              customColumnKey: column.key,
              prompt: column.automation.prompt || column.aiPrompt,
              leads,
            }),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return (data.error as string) || "Column automation failed";
          }
          const updated = (await response.json()) as Lead[];
          const byId = new Map(updated.map((l) => [l.id, l]));
          setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
          showToast(`Ran "${column.label}" on ${ids.length} row(s)`);
          return null;
        } catch {
          return "Column automation failed";
        }
      }
      return null;
    },
    [token, authHeaders, leads, showToast, enrichLeads, recalculateScores, syncHubSpot, researchWebsite]
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
        customColumns,
        toast,
        showToast,
        updateLead,
        updateContact,
        toggleExpand,
        addLead,
        addQuickRow,
        refetchLeads,
        refetchColumns,
        deleteCustomColumn,
        recalculateScores,
        enrichLeads,
        runAiColumns,
        runColumnAutomation,
        researchWebsite,
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
