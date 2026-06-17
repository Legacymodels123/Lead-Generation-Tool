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
import type { Batch, Lead } from "./types";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, "id" | "workspaceId">) => Promise<string | null>;
  refetchLeads: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch leads from API
  const refetchLeads = useCallback(async () => {
    if (!token) {
      setLeads([]);
      return;
    }

    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch leads when token changes
  useEffect(() => {
    refetchLeads();
  }, [token, refetchLeads]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateLead = useCallback(
    async (id: string, updates: Partial<Lead>) => {
      if (!token) return;

      try {
        const response = await fetch("/api/leads", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ leadId: id, ...updates }),
        });

        if (response.ok) {
          // Update local state optimistically
          setLeads((prev) =>
            prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
          );
          showToast("✓ Lead updated");
        } else {
          showToast("✗ Failed to update lead");
        }
      } catch (error) {
        console.error("Failed to update lead:", error);
        showToast("✗ Error updating lead");
      }
    },
    [token, showToast]
  );

  const addLead = useCallback(
    async (lead: Omit<Lead, "id" | "workspaceId">) => {
      if (!token) {
        showToast("✗ Not authenticated");
        return null;
      }

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(lead),
        });

        if (response.ok) {
          const data = await response.json();
          setLeads((prev) => [data.lead, ...prev]);
          showToast("✓ Lead created");
          return data.lead.id;
        } else {
          showToast("✗ Failed to create lead");
          return null;
        }
      } catch (error) {
        console.error("Failed to create lead:", error);
        showToast("✗ Error creating lead");
        return null;
      }
    },
    [token, showToast]
  );

  return (
    <AppContext.Provider
      value={{
        leads,
        batches,
        toast,
        showToast,
        updateLead,
        addLead,
        refetchLeads,
      }}
    >
      {children}
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
