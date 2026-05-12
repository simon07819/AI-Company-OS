import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let productsRoot = "";
let runtimeRoot = "";

beforeEach(() => {
  productsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-command-products-"));
  runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-command-runtime-"));
  vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", productsRoot);
  vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(productsRoot, { recursive: true, force: true });
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
});

async function postCommand(prompt: string) {
  const { POST } = await import("@/app/api/ceo/command/route");
  return POST(new NextRequest("http://test.local/api/ceo/command", {
    method: "POST",
    body: JSON.stringify({ prompt }),
    headers: { "Content-Type": "application/json" },
  }));
}

describe("CEO command API", () => {
  it("creates structured website artifacts for a construction request", async () => {
    const response = await postCommand("Je veux un site web premium pour une entreprise de construction");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestType).toBe("website");
    expect(payload.workspaceHref).toMatch(/^\/projects\//);
    expect(payload.artifactPaths.length).toBeGreaterThan(0);
    expect(payload.artifactPaths.every((artifactPath: string) => fs.existsSync(path.resolve(process.cwd(), artifactPath)))).toBe(true);
    expect(payload.artifactPaths.join("\n")).toContain("README.md");
    expect(payload.artifactPaths.join("\n")).toContain("product-spec.json");
  });

  it("creates structured SaaS artifacts for a clinic request", async () => {
    const response = await postCommand("Je veux un SaaS pour gérer les rendez-vous d'une clinique");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestType).toBe("saas");
    expect(payload.workspaceHref).toMatch(/^\/projects\//);
    expect(payload.artifactPaths.join("\n")).toMatch(/patients|appointments|product-spec\.json|README\.md/);
  });

  it("creates honest branding artifacts for ELEVIO without generic fallback", async () => {
    const response = await postCommand("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.title).toContain("ELEVIO");
    expect(JSON.stringify(payload)).not.toContain("Nouvelle Marque AI");
    expect(payload.requestType).toBe("branding");
    expect(payload.artifactPaths.filter((artifactPath: string) => artifactPath.endsWith(".svg")).length).toBeGreaterThanOrEqual(3);
    expect(payload.artifactPaths.some((artifactPath: string) => /final-logo\.svg$/.test(artifactPath))).toBe(true);
  });

  it("returns the requested logo deliverable for a bare EKIDA logo prompt", async () => {
    const response = await postCommand("logo EKIDA sur fond noir");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestType).toBe("branding");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.brandName).toBe("EKIDA");
    expect(payload.title).toBe("Logo EKIDA");
    expect(payload.shortMessage).toBe("Voici une première version du logo EKIDA.");
    expect(payload.title).not.toContain("sur fond noir");
    expect(payload.primaryVisualPath).toMatch(/final-logo\.svg$/);
    expect(payload.primaryVisual).toContain("<svg");
    expect(payload.primaryVisual).toContain("EKIDA");
    expect(payload.expert.designTeam).toBeTruthy();
    expect(JSON.stringify(payload)).not.toContain("Marque à nommer");
    expect(payload.title).not.toMatch(/Brand system/i);
  });

  it("refuses missing prompts instead of returning fake success", async () => {
    const response = await postCommand("");
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.artifactPaths).toEqual([]);
  });

  it("keeps Node filesystem reads out of client CEO components", () => {
    const ceoComponentsDir = path.join(process.cwd(), "src", "components", "ceo");
    const files = fs.readdirSync(ceoComponentsDir).filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));
    const source = files.map((file) => fs.readFileSync(path.join(ceoComponentsDir, file), "utf-8")).join("\n");

    expect(source).not.toMatch(/from ["']fs["']|from ["']path["']|require\(["']fs["']\)|require\(["']path["']\)/);
    expect(source).not.toContain("generated-products/");
  });
});
