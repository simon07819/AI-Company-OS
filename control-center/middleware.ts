import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth/serverAuth";

const PUBLIC_API_PREFIXES = [
  "/api/status",
  "/api/system/health",
  "/api/demo/readiness",
  "/api/runtime-mode",
];

const ADMIN_API_PREFIXES = [
  "/api/admin",
  "/api/runtime/reset",
  "/api/runtime/agent",
  "/api/logs",
  "/api/system/backup",
  "/api/system/backups",
];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || matches(pathname, PUBLIC_API_PREFIXES)) {
    return NextResponse.next();
  }

  if (matches(pathname, ADMIN_API_PREFIXES)) {
    const auth = requireAdmin(request);
    return auth.response ?? NextResponse.next();
  }

  const auth = requireUser(request);
  return auth.response ?? NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
