"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "./types";
import { DEFAULT_WORKSPACE_ID, STARTING_CREDITS } from "./types";
import { generateId } from "./utils";

const USERS_KEY = "lgt-users";
const SESSION_KEY = "lgt-session";

export function getDataKey(userId: string): string {
  return `lgt-data-${userId}`;
}

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// localStorage helpers
function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

function loadSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSession(userId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, userId);
  }
}

function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, company: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize on mount
  useEffect(() => {
    async function init() {
      try {
        // Always try localStorage first (it's our reliable fallback)
        const sessionId = loadSession();
        if (sessionId) {
          const users = loadUsers();
          const found = users.find((u) => u.id === sessionId);
          if (found) {
            setUser(found);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      }

      setLoading(false);
    }

    init();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const users = loadUsers();
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

        if (!found) {
          return "E-mailadres niet gevonden";
        }

        if (found.password !== password) {
          return "Wachtwoord onjuist";
        }

        saveSession(found.id);
        setUser(found);
        return null;
      } catch (err) {
        return "Login mislukt";
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string, company: string): Promise<string | null> => {
      try {
        const users = loadUsers();

        if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return "Dit e-mailadres is al in gebruik";
        }

        const newUser: User = {
          id: generateId(),
          email: email.toLowerCase(),
          password,
          name,
          company,
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
            nightlyAgent: false,
            hubspotConnected: false,
          },
        };

        users.push(newUser);
        saveUsers(users);
        saveSession(newUser.id);
        setUser(newUser);
        return null;
      } catch (err) {
        return "Registratie mislukt";
      }
    },
    []
  );

  const logout = useCallback(async () => {
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user) return;

    const updated = { ...user, ...updates };
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = updated;
      saveUsers(users);
    }
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
