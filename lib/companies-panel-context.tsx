"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CompaniesPanelContextValue {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  panelSearch: string;
  setPanelSearch: (q: string) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  scrollToLeadId: string | null;
  requestScrollToLead: (id: string) => void;
  clearScrollRequest: () => void;
}

const CompaniesPanelContext = createContext<CompaniesPanelContextValue | null>(null);

export function CompaniesPanelProvider({ children }: { children: ReactNode }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [panelSearch, setPanelSearch] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [scrollToLeadId, setScrollToLeadId] = useState<string | null>(null);

  const requestScrollToLead = useCallback((id: string) => {
    setSelectedLeadId(id);
    setScrollToLeadId(id);
  }, []);

  const clearScrollRequest = useCallback(() => setScrollToLeadId(null), []);

  const value = useMemo(
    () => ({
      selectedLeadId,
      setSelectedLeadId,
      panelSearch,
      setPanelSearch,
      rightPanelOpen,
      setRightPanelOpen,
      scrollToLeadId,
      requestScrollToLead,
      clearScrollRequest,
    }),
    [
      selectedLeadId,
      panelSearch,
      rightPanelOpen,
      scrollToLeadId,
      requestScrollToLead,
      clearScrollRequest,
    ]
  );

  return (
    <CompaniesPanelContext.Provider value={value}>{children}</CompaniesPanelContext.Provider>
  );
}

export function useCompaniesPanel() {
  const ctx = useContext(CompaniesPanelContext);
  if (!ctx) {
    throw new Error("useCompaniesPanel must be used within CompaniesPanelProvider");
  }
  return ctx;
}

export function useCompaniesPanelOptional() {
  return useContext(CompaniesPanelContext);
}
