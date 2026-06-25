import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const PROTECTED_PREFIXES = [
  "/companies",
  "/integrations",
  "/setup",
  "/settings",
  "/qualified",
  "/contacts",
  "/automations",
  "/workspace",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const autoLogin = new URL("/api/auth/auto-login", request.url);
    autoLogin.searchParams.set("next", pathname);
    return NextResponse.redirect(autoLogin);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/companies/:path*",
    "/integrations/:path*",
    "/setup/:path*",
    "/settings/:path*",
    "/qualified/:path*",
    "/contacts/:path*",
    "/automations/:path*",
    "/workspace/:path*",
  ],
};
