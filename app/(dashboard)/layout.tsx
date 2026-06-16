"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import { AppProvider, useApp } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="login-page">
        <div style={{ color: "#888", fontSize: 14 }}>Laden...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">{children}</div>
      <Toast />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthGuard>{children}</AuthGuard>
      </AppProvider>
    </AuthProvider>
  );
}
