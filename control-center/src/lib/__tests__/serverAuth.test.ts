import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../../../middleware";
import { getCurrentUser, isDevBypassAllowed, requireAdmin, requireUser } from "@/lib/auth/serverAuth";

function request(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server auth guards", () => {
  it("allows local dev bypass only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevBypassAllowed(request("http://localhost:3000/api/ceo/command"))).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isDevBypassAllowed(request("http://localhost:3000/api/ceo/command"))).toBe(false);
  });

  it("blocks private API routes in production without configured auth", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_COMPANY_AUTH_TOKEN", "");
    vi.stubEnv("AIOS_AUTH_TOKEN", "");

    const response = middleware(request("https://app.example.com/api/ceo/command"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "unauthorized" });
  });

  it("keeps explicit public API routes accessible", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = middleware(request("https://app.example.com/api/status"));
    expect(response.status).toBe(200);
  });

  it("accepts a configured local auth token for private API routes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_COMPANY_AUTH_TOKEN", "test-local-token");

    const response = middleware(request("https://app.example.com/api/runtime/status", {
      headers: { authorization: "Bearer test-local-token" },
    }));
    expect(response.status).toBe(200);
  });

  it("rejects invalid tokens without exposing expected values", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_COMPANY_AUTH_TOKEN", "test-local-token");

    const auth = requireUser(request("https://app.example.com/api/ceo/upload", {
      headers: { authorization: "Bearer wrong-token" },
    }));
    expect(auth.response.status).toBe(401);
  });

  it("requires admin for admin API routes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_COMPANY_AUTH_TOKEN", "");
    vi.stubEnv("AIOS_AUTH_TOKEN", "");

    const auth = requireAdmin(request("https://app.example.com/api/admin/reset-company-os"));
    expect(auth.response.status).toBe(403);
  });

  it("returns a dev user for local development requests", () => {
    vi.stubEnv("NODE_ENV", "development");
    const auth = getCurrentUser(request("http://127.0.0.1:3000/api/runtime/queue"));
    expect(auth.user).toMatchObject({ id: "local-dev", role: "admin", authMode: "dev_bypass" });
  });
});
