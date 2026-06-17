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
import { setCachedToken } from "./api-headers";
import { createClient } from "./supabase/client";
import type { User } from "./types";
import { DEFAULT_WORKSPACE_ID, STARTING_CREDITS } from "./types";
import { generateId } from "./utils";

const USERS_KEY = "legacy-leadgen-users";
const SESSION_KEY = "legacy-leadgen-session";

function isSupabaseAuthEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureDemoUser(): void {
  const users = loadUsers();
  if (!users.find((u) => u.email === "levi@legacy.com")) {
    users.push({
      id: "demo-user",
      email: "levi@legacy.com",
      password: "legacy123",
      name: "Levi Kempen",
      company: "Legacy Scale Models",
      credits: STARTING_CREDITS,
      workspaceId: DEFAULT_WORKSPACE_ID,
      transactions: [
        {
          id: generateId(),
          type: "bonus",
          amount: STARTING_CREDITS,
          description: "Welkomstbonus",
          createdAt: new Date().toISOString(),
        },
      ],
      integrations: {
        linkedin: true,
        crm: false,
        webhooks: false,
        nightlyAgent: true,
        hubspotConnected: false,
      },
    });
    saveUsers(users);
  }
}

function userFromSupabaseSession(
  id: string,
  email: string,
  metadata?: Record<string, unknown>
): User {
  return {
    id,
    email,
    password: "",
    name: (metadata?.name as string) ?? email.split("@")[0],
    company: (metadata?.company as string) ?? "Legacy Scale Models",
    credits: STARTING_CREDITS,
    workspaceId: DEFAULT_WORKSPACE_ID,
    transactions: [],
    integrations: {
      linkedin: true,
      crm: false,
      webhooks: false,
      nightlyAgent: true,
      hubspotConnected: false,
    },
  };
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authMode: "supabase" | "local";
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, company: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authMode: "supabase" | "local" = isSupabaseAuthEnabled() ? "supabase" : "local";

  const refreshUser = useCallback(() => {
    if (authMode === "local") {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        setUser(null);
        return;
      }
      const found = loadUsers().find((u) => u.id === sessionId);
      setUser(found ?? null);
      if (!found) localStorage.removeItem(SESSION_KEY);
    }
  }, [authMode]);

  useEffect(() => {
    ensureDemoUser();

    async function init() {
      if (authMode === "supabase") {
        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            setCachedToken(data.session.access_token);
            setUser(
              userFromSupabaseSession(
                data.session.user.id,
                data.session.user.email ?? "",
                data.session.user.user_metadata
              )
            );
          }
          supabase.auth.onAuthStateChange((_event, session) => {
            setCachedToken(session?.access_token ?? null);
            if (session?.user) {
              setUser(
                userFromSupabaseSession(
                  session.user.id,
                  session.user.email ?? "",
                  session.user.user_metadata
                )
              );
            } else {
              setUser(null);
            }
          });
        } catch (err) {
          console.error("Supabase auth error:", err);
          refreshUser();
        }
      } else {
        refreshUser();
      }
      setLoading(false);
    }

    init();
  }, [authMode, refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (authMode === "supabase") {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            if (email === "levi@legacy.com" && password === "legacy123") {
              ensureDemoUser();
              const found = loadUsers().find((u) => u.email === "levi@legacy.com");
              if (found) {
                localStorage.setItem(SESSION_KEY, found.id);
                setUser(found);
                return null;
              }
            }
            return error.message;
          }
          if (data.session) setCachedToken(data.session.access_token);
          if (data.user) {
            setUser(
              userFromSupabaseSession(data.user.id, data.user.email ?? "", data.user.user_metadata)
            );
          }
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Login mislukt";
        }
      }

      ensureDemoUser();
      const found = loadUsers().find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!found) return "Onjuist e-mailadres of wachtwoord.";
      localStorage.setItem(SESSION_KEY, found.id);
      setUser(found);
      return null;
    },
    [authMode]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, company: string): Promise<string | null> => {
      if (!name.trim() || !email.trim() || !password.trim()) {
        return "Vul alle velden in.";
      }
      if (password.length < 6) return "Wachtwoord moet minimaal 6 tekens zijn.";

      if (authMode === "supabase") {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name: name.trim(), company: company.trim() || "Legacy Scale Models" },
            },
          });
          if (error) return error.message;
          if (data.session && data.user) {
            setCachedToken(data.session.access_token);
            setUser(
              userFromSupabaseSession(data.user.id, data.user.email ?? "", data.user.user_metadata)
            );
          }
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Registratie mislukt";
        }
      }

      ensureDemoUser();
      const users = loadUsers();
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return "Dit e-mailadres is al geregistreerd.";
      }
      const newUser: User = {
        id: generateId(),
        email: email.toLowerCase(),
        password,
        name: name.trim(),
        company: company.trim() || "Legacy Scale Models",
        credits: STARTING_CREDITS,
        workspaceId: DEFAULT_WORKSPACE_ID,
        transactions: [
          {
            id: generateId(),
            type: "bonus",
            amount: STARTING_CREDITS,
            description: "Welkomstbonus",
            createdAt: new Date().toISOString(),
          },
        ],
        integrations: {
          linkedin: false,
          crm: false,
          webhooks: false,
          nightlyAgent: true,
          hubspotConnected: false,
        },
      };
      users.push(newUser);
      saveUsers(users);
      localStorage.setItem(SESSION_KEY, newUser.id);
      setUser(newUser);
      return null;
    },
    [authMode]
  );

  const logout = useCallback(async () => {
    if (authMode === "supabase") {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setCachedToken(null);
    setUser(null);
  }, [authMode]);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!user) return;
      if (authMode === "local") {
        const users = loadUsers();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx === -1) return;
        const updated = { ...users[idx], ...updates };
        users[idx] = updated;
        saveUsers(users);
        setUser(updated);
      } else {
        setUser({ ...user, ...updates });
      }
    },
    [user, authMode]
  );

  const value = useMemo(
    () => ({ user, loading, authMode, login, register, logout, updateUser, refreshUser }),
    [user, loading, authMode, login, register, logout, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getDataKey(userId: string): string {
  return `legacy-leadgen-data-${userId}`;
}
