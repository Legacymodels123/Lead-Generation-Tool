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
import { STARTING_CREDITS } from "./types";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize on mount - restore session from token
  useEffect(() => {
    async function init() {
      try {
        const savedToken =
          typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;

        if (!savedToken) return;

        setToken(savedToken);

        const cachedUser =
          typeof window !== "undefined" ? sessionStorage.getItem("auth_user") : null;
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
          if (typeof window !== "undefined") {
            sessionStorage.setItem("auth_user", JSON.stringify(data.user));
          }
        } else {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("auth_user");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
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
        return null;
      } catch (error) {
        return "Registration failed: " + (error as Error).message;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    // Clear sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    }
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
