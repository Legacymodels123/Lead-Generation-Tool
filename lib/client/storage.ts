"use client";

import type { Lead, WorkspaceConfig } from "@/lib/types";

const LEADS_KEY = "lg_leads_cache";
const CONFIG_KEY = "lg_workspace_config";

function storageKey(prefix: string, workspaceId: string): string {
  return `${prefix}:${workspaceId}`;
}

export function loadLeadsCache(workspaceId: string): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(LEADS_KEY, workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLeadsCache(workspaceId: string, leads: Lead[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(LEADS_KEY, workspaceId), JSON.stringify(leads));
  } catch {
    /* quota */
  }
}

export function loadWorkspaceConfigCache(workspaceId: string): WorkspaceConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(CONFIG_KEY, workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceConfig;
  } catch {
    return null;
  }
}

export function saveWorkspaceConfigCache(workspaceId: string, config: WorkspaceConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(CONFIG_KEY, workspaceId), JSON.stringify(config));
  } catch {
    /* quota */
  }
}

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export function loadAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthSession(token: string, userJson: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, userJson);
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, userJson);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function loadAuthUserJson(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);
}
