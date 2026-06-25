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

async function resolveInitialToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const fromStorage = sessionStorage.getItem("auth_token");
  if (fromStorage) return fromStorage;

  if (!isSupabaseBrowserConfigured()) return null;

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    if (accessToken) {
      sessionStorage.setItem("auth_token", accessToken);
      setCachedToken(accessToken);
    }
    return accessToken;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const savedToken = await resolveInitialToken();
        if (!savedToken) return;

        setToken(savedToken);
        setCachedToken(savedToken);

        const cachedUser = sessionStorage.getItem("auth_user");
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser) as User);
          } catch {
            /* ignore */
          }
        }

        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          sessionStorage.setItem("auth_user", JSON.stringify(data.user));
          await fetch("/api/auth/sync-cookie", {
            method: "POST",
            headers: { Authorization: `Bearer ${savedToken}` },
          });
        } else {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("auth_user");
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
        const { user: userData, token: authToken } = data;

        // Store token in sessionStorage only (temporary, not persistent)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("auth_token", authToken);
          sessionStorage.setItem("auth_user", JSON.stringify(userData));
        }

        setToken(authToken);
        setUser(userData);
        setCachedToken(authToken);
        await fetch("/api/auth/sync-cookie", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        return null;
      } catch (error) {
        return "Login failed: " + (error as Error).message;
      }
    },
    []
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
        const { user: userData, token: authToken } = data;

        // Store token in sessionStorage only
        if (typeof window !== "undefined") {
          sessionStorage.setItem("auth_token", authToken);
          sessionStorage.setItem("auth_user", JSON.stringify(userData));
        }

        setToken(authToken);
        setUser(userData);
        setCachedToken(authToken);
        await fetch("/api/auth/sync-cookie", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        return null;
      } catch (error) {
        return "Registration failed: " + (error as Error).message;
      }
    },
    []
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
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    }
    setCachedToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
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
