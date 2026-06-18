"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, getDataKey } from "./auth";
import {
  dispatchWebhookCloud,
  enrichLeadsCloud,
  fetchCloudData,
  fetchServiceStatus,
  patchCloudLead,
  postCloudLead,
  pushInstantlyCloud,
  recalculateCloudScores,
  runAiColumnsCloud,
  runBatchCloud,
  saveCloudSnapshot,
  syncHubSpotCloud,
  syncUserSettingsCloud,
} from "./data/leads-client";
import { SEED_LEADS } from "./seed-data";
import type { Batch, Contact, CreditTransaction, Integrations, Lead, UserData } from "./types";
import { DEFAULT_AI_COLUMNS, type AiColumnKey } from "./types/automation";
import { WORKFLOW_PRESETS } from "./automation/presets";
import { loadUserSettings } from "./user-settings";
import { CREDIT_COSTS, DEFAULT_WORKSPACE_ID, NIGHTLY_BATCH_LEADS } from "./types";
import { normalizeLead, syncPrimaryContactFields, updateContactInLead } from "./utils/contacts";
import { fitScore, generateId, todayBatchDate } from "./utils";

export type StorageMode = "local" | "cloud" | "loading";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  storageMode: StorageMode;
  workspaceId: string;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  updateContact: (leadId: string, contactId: string, updates: Partial<Contact>) => void;
  toggleExpand: (id: string) => void;
  addLead: (
    lead: Omit<Lead, "id" | "score" | "batch" | "isNew" | "contacts" | "workspaceId">
  ) => Promise<{ error?: string; id?: string }>;
  addQuickRow: () => string | null;
  recalculateScores: (ids: string[]) => Promise<string | null>;
  runAiColumns: (ids: string[], columns?: AiColumnKey[]) => Promise<string | null>;
  enrichLeads: (ids: string[]) => Promise<string | null>;
  syncHubSpot: (ids: string[]) => Promise<string | null>;
  runWorkflow: (presetId: string, ids: string[]) => Promise<string | null>;
  pushInstantly: (ids: string[]) => Promise<string | null>;
  emitBatchImported: (count: number, leadIds: string[]) => void;
  runNightlyBatch: () => Promise<string | null>;
  spendCredits: (amount: number, description: string) => boolean;
  addCredits: (amount: number, description: string) => void;
  updateIntegrations: (integrations: Integrations) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(getDataKey(userId));
    if (raw) {
      const data = JSON.parse(raw) as UserData;
      return {
        leads: data.leads.map((l) => normalizeLead(l)),
        batches: data.batches,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    leads: SEED_LEADS.map((l) => normalizeLead(l)),
    batches: [
      {
        id: "batch-1",
        date: "2026-06-13",
        label: "Nightly batch — 13 juni 2026",
        leadCount: 5,
        creditsUsed: 50,
        createdAt: "2026-06-13T02:00:00.000Z",
      },
      {
        id: "batch-2",
        date: "2026-06-12",
        label: "Nightly batch — 12 juni 2026",
        leadCount: 5,
        creditsUsed: 50,
        createdAt: "2026-06-12T02:00:00.000Z",
      },
    ],
  };
}

function saveUserData(userId: string, data: UserData): void {
  localStorage.setItem(getDataKey(userId), JSON.stringify(data));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const [cloudAvailable, setCloudAvailable] = useState(false);
  const workspaceId = user?.workspaceId ?? DEFAULT_WORKSPACE_ID;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const emitWebhook = useCallback(
    async (event: string, data: Record<string, unknown>) => {
      if (!user?.integrations.webhooks) return;
      const settings = loadUserSettings(user.id);
      if (!settings.webhookUrl) return;
      await dispatchWebhookCloud(user.id, event, data);
    },
    [user]
  );

  useEffect(() => {
    fetchServiceStatus()
      .then((s) => setCloudAvailable(Boolean(s.cloud)))
      .catch(() => setCloudAvailable(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setBatches([]);
      setStorageMode("loading");
      return;
    }

    let cancelled = false;

    async function load() {
      setStorageMode("loading");
      if (cloudAvailable) {
        try {
          const data = await fetchCloudData(user!.id);
          if (!cancelled) {
            setLeads(data.leads.map((l) => normalizeLead(l)));
            setBatches(data.batches);
            setStorageMode("cloud");
          }
          return;
        } catch {
          if (!cancelled) {
            showToast("Cloud laden mislukt — controleer Supabase instellingen");
          }
        }
      }

      const data = loadUserData(user!.id);
      if (!cancelled) {
        setLeads(data.leads);
        setBatches(data.batches);
        setStorageMode("local");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, cloudAvailable, showToast]);

  const persistLocal = useCallback(
    (newLeads: Lead[], newBatches: Batch[]) => {
      if (!user) return;
      saveUserData(user.id, { leads: newLeads, batches: newBatches });
    },
    [user]
  );

  const persistAll = useCallback(
    async (newLeads: Lead[], newBatches: Batch[]) => {
      if (!user) return;
      if (storageMode === "cloud") {
        try {
          await saveCloudSnapshot(user.id, newLeads, newBatches);
        } catch {
          showToast("Cloud opslaan mislukt — lokaal terugval");
          persistLocal(newLeads, newBatches);
        }
      } else {
        persistLocal(newLeads, newBatches);
      }
    },
    [user, storageMode, persistLocal, showToast]
  );

  const addTransaction = useCallback(
    (tx: CreditTransaction) => {
      if (!user) return;
      updateUser({
        transactions: [tx, ...user.transactions],
      });
    },
    [user, updateUser]
  );

  const spendCredits = useCallback(
    (amount: number, description: string): boolean => {
      if (!user) return false;
      if (user.credits < amount) return false;
      updateUser({ credits: user.credits - amount });
      addTransaction({
        id: generateId(),
        type: "spend",
        amount: -amount,
        description,
        createdAt: new Date().toISOString(),
      });
      return true;
    },
    [user, updateUser, addTransaction]
  );

  const addCredits = useCallback(
    (amount: number, description: string) => {
      if (!user) return;
      updateUser({ credits: user.credits + amount });
      addTransaction({
        id: generateId(),
        type: "purchase",
        amount,
        description,
        createdAt: new Date().toISOString(),
      });
      showToast(`${amount} credits toegevoegd!`);
    },
    [user, updateUser, addTransaction, showToast]
  );

  const updateLead = useCallback(
    (id: string, updates: Partial<Lead>) => {
      setLeads((prev) => {
        const prevLead = prev.find((l) => l.id === id);
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          const merged = syncPrimaryContactFields(
            normalizeLead({ ...l, ...updates, id })
          );
          return { ...merged, score: fitScore(merged) };
        });
        const updated = next.find((l) => l.id === id);
        if (updated && user && storageMode === "cloud") {
          patchCloudLead(user.id, id, updated).catch(() =>
            showToast("Wijziging kon niet worden opgeslagen")
          );
        } else {
          persistLocal(next, batches);
        }
        if (
          prevLead &&
          updates.status &&
          updates.status !== prevLead.status &&
          user
        ) {
          emitWebhook("lead.status_changed", {
            leadId: id,
            company: updated?.company,
            from: prevLead.status,
            to: updates.status,
          });
        }
        return next;
      });
    },
    [batches, persistLocal, showToast, storageMode, user, emitWebhook]
  );

  const updateContact = useCallback(
    (leadId: string, contactId: string, updates: Partial<Contact>) => {
      setLeads((prev) => {
        const next = prev.map((l) => {
          if (l.id !== leadId) return l;
          const merged = syncPrimaryContactFields(updateContactInLead(l, contactId, updates));
          return { ...merged, score: fitScore(merged) };
        });
        const updated = next.find((l) => l.id === leadId);
        if (updated && user && storageMode === "cloud") {
          patchCloudLead(user.id, leadId, updated).catch(() =>
            showToast("Contact kon niet worden opgeslagen")
          );
        } else {
          persistLocal(next, batches);
        }
        return next;
      });
    },
    [batches, persistLocal, showToast, storageMode, user]
  );

  const toggleExpand = useCallback((id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, expanded: !l.expanded } : l))
    );
  }, []);

  const addLead = useCallback(
    async (
      lead: Omit<Lead, "id" | "score" | "batch" | "isNew" | "contacts" | "workspaceId">
    ): Promise<{ error?: string; id?: string }> => {
      if (!user) return { error: "Niet ingelogd." };
      if (!spendCredits(CREDIT_COSTS.addLead, "Handmatige lead toegevoegd")) {
        return { error: `Onvoldoende credits. ${CREDIT_COSTS.addLead} credits vereist.` };
      }
      const batch = todayBatchDate();
      const newLead = normalizeLead({
        ...lead,
        id: generateId(),
        workspaceId,
        batch,
        isNew: true,
        score: fitScore({ ...lead, workspaceId }),
      });

      if (storageMode === "cloud") {
        try {
          const saved = await postCloudLead(user.id, newLead);
          setLeads((prev) => [normalizeLead(saved), ...prev]);
        } catch {
          showToast("Lead kon niet in cloud worden opgeslagen");
          return { error: "Cloud opslaan mislukt" };
        }
      } else {
        setLeads((prev) => {
          const next = [newLead, ...prev];
          persistLocal(next, batches);
          return next;
        });
      }

      showToast("Lead toegevoegd!");
      emitWebhook("lead.created", { leadId: newLead.id, company: newLead.company });
      return { id: newLead.id };
    },
    [user, batches, spendCredits, persistLocal, showToast, storageMode, workspaceId, emitWebhook]
  );

  const addQuickRow = useCallback((): string | null => {
    if (!user) return "Niet ingelogd.";
    const batch = todayBatchDate();
    const newLead = normalizeLead({
      id: generateId(),
      workspaceId,
      company: "Nieuw bedrijf",
      country: "Nederland",
      market: "",
      employees: 100,
      revenue: "",
      sector: "Agri Dealer",
      fitReason: "",
      website: "",
      linkedinCompanyUrl: "",
      contactName: "",
      contactTitle: "",
      linkedinUrl: "",
      status: "nieuw",
      batch,
      isNew: true,
      notes: "",
      message: "",
      score: fitScore({ country: "Nederland", employees: 100, sector: "Agri Dealer", workspaceId }),
    });

    if (storageMode === "cloud") {
      postCloudLead(user.id, newLead)
        .then((saved) => setLeads((prev) => [normalizeLead(saved), ...prev]))
        .catch(() => showToast("Rij kon niet in cloud worden opgeslagen"));
    } else {
      setLeads((prev) => {
        const next = [newLead, ...prev];
        persistLocal(next, batches);
        return next;
      });
    }

    showToast("Nieuwe rij toegevoegd");
    return null;
  }, [user, batches, persistLocal, showToast, storageMode, workspaceId]);

  const recalculateScores = useCallback(
    async (ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      if (storageMode === "cloud") {
        try {
          const updated = await recalculateCloudScores(user.id, ids);
          setLeads((prev) => {
            const map = new Map(updated.map((l) => [l.id, normalizeLead(l)]));
            return prev.map((l) => map.get(l.id) ?? l);
          });
          showToast(`Score herberekend voor ${updated.length} leads`);
          return null;
        } catch {
          return "Automatisering mislukt.";
        }
      }

      setLeads((prev) => {
        const idSet = new Set(ids);
        const next = prev.map((l) =>
          idSet.has(l.id) ? { ...l, score: fitScore(l) } : l
        );
        persistLocal(next, batches);
        showToast(`Score herberekend voor ${ids.length} leads`);
        return next;
      });
      return null;
    },
    [user, batches, persistLocal, showToast, storageMode]
  );

  const runAiColumns = useCallback(
    async (ids: string[], columns: AiColumnKey[] = DEFAULT_AI_COLUMNS): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const idSet = new Set(ids);
      setLeads((prev) =>
        prev.map((l) => (idSet.has(l.id) ? { ...l, aiStatus: "running" as const } : l))
      );

      try {
        const snapshot = leads.filter((l) => idSet.has(l.id));
        const updated = await runAiColumnsCloud(user.id, ids, columns, snapshot);

        setLeads((prev) => {
          const map = new Map(
            updated.map((l) => [l.id, { ...normalizeLead(l), aiStatus: "done" as const }])
          );
          const next = prev.map((l) => map.get(l.id) ?? l);
          if (storageMode !== "cloud") {
            persistLocal(next, batches);
          }
          return next;
        });

        showToast(`AI kolommen ingevuld voor ${updated.length} leads`);
        emitWebhook("automation.completed", {
          type: "ai_columns",
          columns,
          count: updated.length,
        });
        return null;
      } catch (e) {
        setLeads((prev) =>
          prev.map((l) => (idSet.has(l.id) ? { ...l, aiStatus: "error" as const } : l))
        );
        return e instanceof Error ? e.message : "AI kolommen mislukt.";
      }
    },
    [user, leads, batches, persistLocal, showToast, storageMode, emitWebhook]
  );

  const enrichLeads = useCallback(
    async (ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const cost = CREDIT_COSTS.enrich * ids.length;
      if (!spendCredits(cost, `Verrijking (${ids.length} accounts)`)) {
        return `Onvoldoende credits. ${cost} credits vereist.`;
      }

      const idSet = new Set(ids);
      setLeads((prev) =>
        prev.map((l) =>
          idSet.has(l.id)
            ? {
                ...l,
                contacts: l.contacts.map((c) => ({ ...c, enrichmentStatus: "running" as const })),
              }
            : l
        )
      );

      try {
        const snapshot = leads.filter((l) => idSet.has(l.id));
        const { leads: updated, aiPowered } = await enrichLeadsCloud(user.id, ids, snapshot);

        setLeads((prev) => {
          const map = new Map(updated.map((l) => [l.id, normalizeLead(l)]));
          const next = prev.map((l) => map.get(l.id) ?? l);
          if (storageMode !== "cloud") {
            persistLocal(next, batches);
          }
          return next;
        });

        showToast(
          `Verrijkt: ${updated.length} accounts${aiPowered ? " (AI)" : " (fallback)"}`
        );
        emitWebhook("automation.completed", {
          type: "enrich",
          count: updated.length,
        });
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Verrijking mislukt.";
      }
    },
    [user, leads, batches, persistLocal, showToast, spendCredits, storageMode, emitWebhook]
  );

  const syncHubSpot = useCallback(
    async (ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const cost = CREDIT_COSTS.hubspotSync * ids.length;
      if (!spendCredits(cost, `HubSpot sync (${ids.length} accounts)`)) {
        return `Onvoldoende credits. ${cost} credits vereist.`;
      }

      const settings = loadUserSettings(user.id);

      try {
        const snapshot = leads.filter((l) => ids.includes(l.id));
        const { leads: updated, synced, failed } = await syncHubSpotCloud(
          user.id,
          ids,
          snapshot,
          settings.hubspotTimelineNotes
        );

        setLeads((prev) => {
          const map = new Map(updated.map((l) => [l.id, normalizeLead(l)]));
          const next = prev.map((l) => map.get(l.id) ?? l);
          if (storageMode !== "cloud") {
            persistLocal(next, batches);
          }
          return next;
        });

        updateUser({ integrations: { ...user.integrations, crm: true, hubspotConnected: true } });
        showToast(`HubSpot: ${synced} gesynchroniseerd${failed ? `, ${failed} mislukt` : ""}`);
        emitWebhook("automation.completed", { type: "hubspot_sync", synced, failed });
        return failed && !synced ? "HubSpot sync gedeeltelijk mislukt" : null;
      } catch (e) {
        return e instanceof Error ? e.message : "HubSpot sync mislukt.";
      }
    },
    [user, leads, batches, persistLocal, showToast, spendCredits, storageMode, updateUser, emitWebhook]
  );

  const runWorkflow = useCallback(
    async (presetId: string, ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const preset = WORKFLOW_PRESETS.find((p) => p.id === presetId);
      if (!preset) return "Onbekende workflow";

      for (const step of preset.steps) {
        if (step.type === "enrich") {
          const err = await enrichLeads(ids);
          if (err) return err;
        } else if (step.type === "score") {
          const err = await recalculateScores(ids);
          if (err) return err;
        } else if (step.type === "ai") {
          const err = await runAiColumns(ids, step.columns ?? DEFAULT_AI_COLUMNS);
          if (err) return err;
        } else if (step.type === "hubspot") {
          const err = await syncHubSpot(ids);
          if (err) return err;
        }
      }

      showToast(`Workflow "${preset.label}" voltooid`);
      emitWebhook("automation.completed", { type: "workflow", presetId, count: ids.length });
      return null;
    },
    [user, enrichLeads, recalculateScores, runAiColumns, syncHubSpot, showToast, emitWebhook]
  );

  const pushInstantly = useCallback(
    async (ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const settings = loadUserSettings(user.id);
      if (!settings.instantlyCampaignId) {
        return "Stel een Instantly campaign ID in bij Integraties";
      }

      try {
        const snapshot = leads.filter((l) => ids.includes(l.id));
        const { added, errors } = await pushInstantlyCloud(
          user.id,
          ids,
          settings.instantlyCampaignId,
          snapshot
        );
        if (errors.length && !added) {
          return errors[0];
        }
        showToast(`${added} contact(en) naar Instantly`);
        emitWebhook("automation.completed", { type: "instantly", added });
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Instantly mislukt";
      }
    },
    [user, leads, showToast, emitWebhook]
  );

  const emitBatchImported = useCallback(
    (count: number, leadIds: string[]) => {
      emitWebhook("batch.imported", { count, leadIds });
    },
    [emitWebhook]
  );

  const runNightlyBatch = useCallback(async (): Promise<string | null> => {
    if (!user) return "Niet ingelogd.";
    const cost = CREDIT_COSTS.nightlyBatch * NIGHTLY_BATCH_LEADS;
    if (!spendCredits(cost, `Nightly batch (${NIGHTLY_BATCH_LEADS} leads)`)) {
      return `Onvoldoende credits. ${cost} credits vereist voor een batch.`;
    }

    try {
      const existingCompanies = leads.map((l) => l.company);
      const result = await runBatchCloud(
        user.id,
        existingCompanies,
        user.name,
        NIGHTLY_BATCH_LEADS
      );

      const newLeads = result.leads.map((l) => normalizeLead({ ...l, workspaceId, isNew: true }));
      const batch = result.batch;

      setLeads((prev) => {
        const cleared = prev.map((l) => ({ ...l, isNew: false }));
        const next = [...newLeads, ...cleared];
        const nextBatches = [batch, ...batches];
        setBatches(nextBatches);
        persistAll(next, nextBatches);
        return next;
      });

      showToast(
        `${newLeads.length} nieuwe leads (${result.source === "ai" ? "AI" : "templates"})!`
      );
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Batch mislukt.";
    }
  }, [user, leads, batches, spendCredits, persistAll, showToast, workspaceId]);

  const updateIntegrations = useCallback(
    (integrations: Integrations) => {
      updateUser({ integrations });
      if (user) {
        const settings = loadUserSettings(user.id);
        syncUserSettingsCloud(user.id, {
          ...settings,
          nightlyAgent: integrations.nightlyAgent,
        });
      }
      showToast("Integraties opgeslagen");
    },
    [updateUser, showToast, user]
  );

  const value = useMemo(
    () => ({
      leads,
      batches,
      toast,
      storageMode,
      workspaceId,
      showToast,
      updateLead,
      updateContact,
      toggleExpand,
      addLead,
      addQuickRow,
      recalculateScores,
      runAiColumns,
      enrichLeads,
      syncHubSpot,
      runWorkflow,
      pushInstantly,
      emitBatchImported,
      runNightlyBatch,
      spendCredits,
      addCredits,
      updateIntegrations,
    }),
    [
      leads,
      batches,
      toast,
      storageMode,
      workspaceId,
      showToast,
      updateLead,
      updateContact,
      toggleExpand,
      addLead,
      addQuickRow,
      recalculateScores,
      runAiColumns,
      enrichLeads,
      syncHubSpot,
      runWorkflow,
      pushInstantly,
      emitBatchImported,
      runNightlyBatch,
      spendCredits,
      addCredits,
      updateIntegrations,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
