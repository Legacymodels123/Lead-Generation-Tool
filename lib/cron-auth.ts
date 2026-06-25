import type { NextRequest } from "next/server";

export function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return false;
  }

  if (!cronSecret) {
    return true;
  }

  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}
