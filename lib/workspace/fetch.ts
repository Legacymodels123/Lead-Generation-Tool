"use client";

import { useAuth } from "@/lib/auth";

export function useWorkspaceFetch() {
  const { token } = useAuth();

  return async function workspaceFetch(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(path, { ...init, headers });
  };
}
