"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { loadLeadsCache, saveLeadsCache } from "@/lib/client/storage";
import type { Lead, LeadStatus } from "@/lib/types";

export type ResearchStatus = "new" | "researching" | "ready" | "qualified" | "rejected";

export interface AccountRow {
  id: string;
  workspaceId: string;
  companyName: string;
  domain: string;
  country: string;
  city: string;
  industry: string;
  employeeRange: string;
  qualificationStatus: ResearchStatus;
  researchSummary: string;
  fitScore: number | null;
  notes: string;
  syncStatus: "not_synced" | "ready" | "synced";
  website: string;
  source: Lead["source"];
  aiSummary: string;
  aiNextStep: string;
  fitReason: string;
  contactName: string;
  contactTitle: string;
  contactsCount: number;
  lastTouchedAt: string | null;
  lead: Lead;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface ResearchWorkspaceContextValue {
  rows: AccountRow[];
  loading: boolean;
  selectedRowId: string | null;
  selectedRow: AccountRow | null;
  query: string;
  activeStatus: "all" | ResearchStatus;
  storageMode: "cloud" | "memory" | "unknown";
  saveState: SaveState;
  lastSavedAt: string | null;
  setupStatus: { aiReady: boolean; hubspotReady: boolean };
  setQuery: (value: string) => void;
  setActiveStatus: (value: "all" | ResearchStatus) => void;
  selectRow: (rowId: string | null) => void;
  addRow: () => Promise<void>;
  importRows: (items: Array<{ companyName: string; domain: string; country?: string; city?: string }>) => Promise<void>;
  updateRow: (rowId: string, updates: Partial<AccountRow>) => Promise<void>;
  runResearch: (rowIds: string[]) => Promise<void>;
  markStatus: (rowId: string, status: ResearchStatus) => Promise<void>;
  syncToHubSpot: (rowIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const ResearchWorkspaceContext = createContext<ResearchWorkspaceContextValue | null>(null);

function employeeRange(value: number): string {
  if (!value) return "";
  if (value < 11) return "1-10";
  if (value < 51) return "11-50";
  if (value < 201) return "51-200";
  if (value < 501) return "201-500";
  return "500+";
}

function employeeCount(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  if (normalized.includes("500")) return 500;
  const match = normalized.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return Math.round((Number(match[1]) + Number(match[2])) / 2);
  }
  const first = Number.parseInt(normalized, 10);
  return Number.isFinite(first) ? first : 0;
}

function qualificationStatus(lead: Lead): ResearchStatus {
  if (lead.aiStatus === "running") return "researching";
  if (lead.status === "qualified") return "qualified";
  if (lead.status === "not_qualified" && (lead.aiSummary || lead.fitReason || lead.score)) return "ready";
  return "new";
}

function syncStatus(lead: Lead): "not_synced" | "ready" | "synced" {
  if (lead.hubspotCompanyId) return "synced";
  if (lead.status === "qualified") return "ready";
  return "not_synced";
}

function rowFromLead(lead: Lead): AccountRow {
  return {
    id: lead.id,
    workspaceId: lead.workspaceId,
    companyName: lead.company,
    domain: lead.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    country: lead.country,
    city: lead.city,
    industry: lead.sector || lead.market,
    employeeRange: employeeRange(lead.employees),
    qualificationStatus: qualificationStatus(lead),
    researchSummary: lead.aiSummary || lead.fitReason || "",
    fitScore: lead.score ?? lead.aiQualificationScore ?? null,
    notes: lead.notes || "",
    syncStatus: syncStatus(lead),
    website: lead.website,
    source: lead.source,
    aiSummary: lead.aiSummary || "",
    aiNextStep: lead.aiNextStep || "",
    fitReason: lead.fitReason || "",
    contactName: lead.contactName || "",
    contactTitle: lead.contactTitle || "",
    contactsCount: lead.contacts?.length ?? 0,
    lastTouchedAt: null,
    lead,
  };
}

function leadPatchFromRowUpdates(row: AccountRow, updates: Partial<AccountRow>): Partial<Lead> {
  const next = { ...row, ...updates };
  const qualification = next.qualificationStatus;
  const leadStatus: LeadStatus =
    qualification === "qualified" ? "qualified" : "not_qualified";

  return {
    company: next.companyName,
    website: next.website || (next.domain ? `https://${next.domain}` : ""),
    city: next.city,
    country: next.country,
    sector: next.industry,
    market: next.industry,
    employees: employeeCount(next.employeeRange),
    notes: next.notes,
    aiSummary: next.aiSummary,
    aiNextStep: next.aiNextStep,
    fitReason: next.fitReason || next.researchSummary,
    score: next.fitScore ?? 0,
    status: leadStatus,
    contactName: next.contactName,
    contactTitle: next.contactTitle,
  };
}

export function ResearchWorkspaceProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const workspaceId = user?.workspaceId ?? "legacy-scale-models";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | ResearchStatus>("all");
  const [storageMode, setStorageMode] = useState<"cloud" | "memory" | "unknown">("unknown");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState({ aiReady: false, hubspotReady: false });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSetup = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config?mask=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const config = (await res.json()) as {
        apiKeys?: Record<string, string | undefined>;
        oauth?: Record<string, { accessToken?: string } | undefined>;
      };
      const aiReady = Boolean(config.apiKeys?.openai || config.apiKeys?.anthropic);
      const hubspotReady = Boolean(
        config.apiKeys?.hubspot || config.oauth?.hubspot?.accessToken || config.oauth?.hubspot_oauth?.accessToken
      );
      setSetupStatus({ aiReady, hubspotReady });
    } catch {
      /* ignore */
    }
  }, [token, workspaceId]);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Could not load rows");
      }
      const data = await response.json();
      const nextLeads = (data.leads ?? []) as Lead[];
      setLeads(nextLeads);
      setStorageMode(data.storage === "memory" ? "memory" : "cloud");
      saveLeadsCache(workspaceId, nextLeads);
      if (!selectedRowId && nextLeads[0]) {
        setSelectedRowId(nextLeads[0].id);
      }
    } catch {
      const cached = loadLeadsCache(workspaceId);
      setLeads(cached);
      setStorageMode(cached.length ? "memory" : "unknown");
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId, selectedRowId]);

  useEffect(() => {
    void refresh();
    void loadSetup();
  }, [refresh, loadSetup]);

  useEffect(() => {
    if (leads.length) {
      saveLeadsCache(workspaceId, leads);
    }
  }, [leads, workspaceId]);

  const rows = useMemo(() => {
    return leads
      .map(rowFromLead)
      .filter((row) => {
        const matchesQuery =
          !query ||
          row.companyName.toLowerCase().includes(query.toLowerCase()) ||
          row.domain.toLowerCase().includes(query.toLowerCase()) ||
          row.industry.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = activeStatus === "all" || row.qualificationStatus === activeStatus;
        return matchesQuery && matchesStatus;
      });
  }, [leads, query, activeStatus]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) ?? null,
    [rows, selectedRowId]
  );

  const persistLead = useCallback(
    async (leadId: string, patch: Partial<Lead>) => {
      if (!token) return;
      setSaveState("saving");
      try {
        const response = await fetch("/api/leads", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ leadId, ...patch }),
        });
        if (!response.ok) {
          throw new Error("Save failed");
        }
        const data = await response.json();
        if (data.lead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? data.lead : lead)));
        }
        setSaveState("saved");
        setLastSavedAt(new Date().toISOString());
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => setSaveState("idle"), 1800);
      } catch {
        setSaveState("error");
      }
    },
    [token]
  );

  const addRow = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company: "",
        city: "",
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
      }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setLeads((prev) => [data.lead, ...prev]);
    setSelectedRowId(data.lead.id);
    setLastSavedAt(new Date().toISOString());
  }, [token]);

  const importRows = useCallback(
    async (items: Array<{ companyName: string; domain: string; country?: string; city?: string }>) => {
      for (const item of items) {
        if (!item.companyName.trim()) continue;
        const website = item.domain
          ? item.domain.startsWith("http")
            ? item.domain
            : `https://${item.domain}`
          : "";
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company: item.companyName,
            city: item.city ?? "",
            country: item.country ?? "",
            market: "",
            employees: 0,
            revenue: "",
            sector: "",
            fitReason: "",
            website,
            linkedinCompanyUrl: "",
            contactName: "",
            contactTitle: "",
            linkedinUrl: "",
            status: "not_qualified",
            batch: "import",
            isNew: true,
            notes: "",
            message: "",
            contacts: [],
          }),
        });
        if (!response.ok) continue;
        const data = await response.json();
        setLeads((prev) => [data.lead, ...prev]);
      }
      setLastSavedAt(new Date().toISOString());
    },
    [token]
  );

  const updateRow = useCallback(
    async (rowId: string, updates: Partial<AccountRow>) => {
      const row = rows.find((item) => item.id === rowId);
      if (!row) return;
      const patch = leadPatchFromRowUpdates(row, updates);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === rowId ? { ...lead, ...patch } : lead))
      );
      await persistLead(rowId, patch);
    },
    [rows, persistLead]
  );

  const runResearch = useCallback(
    async (rowIds: string[]) => {
      if (!token) return;
      for (const rowId of rowIds) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === rowId ? { ...lead, aiStatus: "running" } : lead))
        );
        const response = await fetch("/api/leads/enrich", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ leadId: rowId, leads }),
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data.lead) {
          setLeads((prev) => prev.map((lead) => (lead.id === rowId ? data.lead : lead)));
          setLastSavedAt(new Date().toISOString());
        }
      }
    },
    [token, leads]
  );

  const markStatus = useCallback(
    async (rowId: string, status: ResearchStatus) => {
      const patch: Partial<AccountRow> = { qualificationStatus: status };
      await updateRow(rowId, patch);
    },
    [updateRow]
  );

  const syncToHubSpot = useCallback(
    async (rowIds: string[]) => {
      if (!token) return;
      const response = await fetch("/api/hubspot/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadIds: rowIds, leads }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.leads?.length) {
        const byId = new Map((data.leads as Lead[]).map((lead) => [lead.id, lead]));
        setLeads((prev) => prev.map((lead) => byId.get(lead.id) ?? lead));
        setLastSavedAt(new Date().toISOString());
      }
      await loadSetup();
    },
    [token, leads, loadSetup]
  );

  return (
    <ResearchWorkspaceContext.Provider
      value={{
        rows,
        loading,
        selectedRowId,
        selectedRow,
        query,
        activeStatus,
        storageMode,
        saveState,
        lastSavedAt,
        setupStatus,
        setQuery,
        setActiveStatus,
        selectRow: setSelectedRowId,
        addRow,
        importRows,
        updateRow,
        runResearch,
        markStatus,
        syncToHubSpot,
        refresh,
      }}
    >
      {children}
    </ResearchWorkspaceContext.Provider>
  );
}

export function useResearchWorkspace() {
  const context = useContext(ResearchWorkspaceContext);
  if (!context) {
    throw new Error("useResearchWorkspace must be used within ResearchWorkspaceProvider");
  }
  return context;
}
