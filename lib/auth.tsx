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
import { isSupabaseBrowserConfigured, createClient } from "@/lib/supabase/client";
import { setCachedToken } from "@/lib/api-headers";
import {
  clearAuthSession,
  loadAuthToken,
  loadAuthUserJson,
  saveAuthSession,
} from "@/lib/client/storage";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, company: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrapSession(): Promise<{ user: User; token: string } | null> {
  const trySession = async (headers?: HeadersInit) => {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      headers,
    });
    if (!res.ok) return null;
    return (await res.json()) as { user: User; token: string };
  };

  const savedToken = loadAuthToken();
  if (savedToken) {
    const fromBearer = await trySession({ Authorization: `Bearer ${savedToken}` });
    if (fromBearer) return fromBearer;
  }

  const fromCookie = await trySession();
  if (fromCookie) return fromCookie;

  const autoRes = await fetch("/api/auth/auto-login", {
    method: "POST",
    credentials: "include",
  });
  if (!autoRes.ok) return null;
  return (await autoRes.json()) as { user: User; token: string };
}

function persistSession(user: User, token: string): void {
  saveAuthSession(token, JSON.stringify(user));
  setCachedToken(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const cachedUser = loadAuthUserJson();
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser) as User);
          } catch {
            /* ignore */
          }
        }

        if (isSupabaseBrowserConfigured()) {
          try {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            const accessToken = data.session?.access_token;
            if (accessToken) {
              persistSession(
                (cachedUser ? JSON.parse(cachedUser) : { id: "" }) as User,
                accessToken
              );
            }
          } catch {
            /* ignore */
          }
        }

        const session = await bootstrapSession();
        if (session) {
          setToken(session.token);
          setUser(session.user);
          persistSession(session.user, session.token);
          await fetch("/api/auth/sync-cookie", {
            method: "POST",
            credentials: "include",
            headers: { Authorization: `Bearer ${session.token}` },
          });
        } else {
          clearAuthSession();
          setToken(null);
          setUser(null);
          setCachedToken(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, []);

  const applyLoginResult = useCallback(async (userData: User, authToken: string) => {
    persistSession(userData, authToken);
    setToken(authToken);
    setUser(userData);
    await fetch("/api/auth/sync-cookie", {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const data = await response.json();
          return data.error || "Login failed";
        }

        const data = await response.json();
        await applyLoginResult(data.user, data.token);
        return null;
      } catch (error) {
        return "Login failed: " + (error as Error).message;
      }
    },
    [applyLoginResult]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      company: string
    ): Promise<string | null> => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, company }),
        });

        if (!response.ok) {
          const data = await response.json();
          return data.error || "Registration failed";
        }

        const data = await response.json();
        await applyLoginResult(data.user, data.token);
        return null;
      } catch (error) {
        return "Registration failed: " + (error as Error).message;
      }
    },
    [applyLoginResult]
  );

  const logout = useCallback(async () => {
    if (isSupabaseBrowserConfigured()) {
      try {
        await createClient().auth.signOut();
      } catch {
        /* ignore */
      }
    }
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    clearAuthSession();
    setCachedToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        const t = loadAuthToken();
        if (t) saveAuthSession(t, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, updateUser }}>
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
