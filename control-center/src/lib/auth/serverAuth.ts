import { NextResponse } from "next/server";

export type ServerUserRole = "admin" | "user";

export interface ServerUser {
  id: string;
  role: ServerUserRole;
  authMode: "token" | "dev_bypass";
}

export interface AuthResult {
  user: ServerUser | null;
  reason?: "missing" | "invalid" | "forbidden" | "unconfigured";
}

type RequestLike = Request | { headers: Headers };

function configuredToken() {
  return process.env.AI_COMPANY_AUTH_TOKEN || process.env.AIOS_AUTH_TOKEN || "";
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function hostFromRequest(request?: RequestLike | null) {
  const headers = request?.headers;
  const host = headers?.get("host") || "";
  if (host) return host.split(":")[0].toLowerCase();
  try {
    return request instanceof Request ? new URL(request.url).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
}

function tokenFromRequest(request: RequestLike) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-aios-auth-token") || cookieValue(request.headers.get("cookie") || "", "aios_auth");
}

function cookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export function isDevBypassAllowed(request?: RequestLike | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const host = hostFromRequest(request);
  if (!host) return true;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
}

export function getCurrentUser(request: RequestLike): AuthResult {
  const expectedToken = configuredToken();
  const receivedToken = tokenFromRequest(request);

  if (expectedToken) {
    if (receivedToken && safeEqual(receivedToken, expectedToken)) {
      return { user: { id: "local-admin", role: "admin", authMode: "token" } };
    }
    return { user: null, reason: receivedToken ? "invalid" : "missing" };
  }

  if (isDevBypassAllowed(request)) {
    return { user: { id: "local-dev", role: "admin", authMode: "dev_bypass" } };
  }

  return { user: null, reason: "unconfigured" };
}

export function unauthorizedResponse(reason: AuthResult["reason"] = "missing") {
  const status = reason === "forbidden" || reason === "unconfigured" ? 403 : 401;
  const message = reason === "unconfigured"
    ? "Authentication is not configured for this environment."
    : reason === "forbidden"
      ? "Admin access required."
      : "Authentication required.";
  return NextResponse.json({ ok: false, error: "unauthorized", message }, { status });
}

export function requireUser(request: RequestLike): { user: ServerUser; response?: never } | { user?: never; response: NextResponse } {
  const result = getCurrentUser(request);
  if (!result.user) return { response: unauthorizedResponse(result.reason) };
  return { user: result.user };
}

export function requireAdmin(request: RequestLike): { user: ServerUser; response?: never } | { user?: never; response: NextResponse } {
  const result = getCurrentUser(request);
  if (!result.user) return { response: unauthorizedResponse(result.reason) };
  if (result.user.role !== "admin") return { response: unauthorizedResponse("forbidden") };
  return { user: result.user };
}
