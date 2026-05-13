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

async function postCommandPayload(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/ceo/command/route");
  return POST(new NextRequest("http://test.local/api/ceo/command", {
    method: "POST",
    body: JSON.stringify(body),
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

  it("does not create instant local logo artifacts when no real visual provider is configured", async () => {
    const response = await postCommand("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_revision");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.brandName).toBe("ELEVIO");
    expect(payload.summary).toBe("Prototype non généré: aucun générateur visuel réel branché.");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.artifactPaths).toEqual([]);
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|final-logo\.svg|<svg|>\s*B\s*</);
  });

  it("blocks the fake instant EKIDA logo path", async () => {
    const response = await postCommand("logo EKIDA sur fond noir");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_revision");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.brandName).toBe("EKIDA");
    expect(payload.title).toBe("Mission lancée");
    expect(payload.shortMessage).toBeUndefined();
    expect(payload.primaryVisualPath).toBeNull();
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.artifactPaths).toEqual([]);
    expect(payload.expert.productionStatus).toBe("blocked_no_visual_provider");
    expect(payload.expert.runtime.finalStatus).toBe("blocked");
    expect(payload.expert.runtime.steps.map((step: { state: string }) => step.state)).toEqual(
      expect.arrayContaining(["queued", "planning", "researching", "generating", "reviewing", "validating"]),
    );
    expect(payload.expert.runtime.provider.visualProviderConfigured).toBe(false);
    expect(payload.expert.companyWorkflow.hiddenDetails.decisions).toContain("Génération SVG locale instantanée bloquée.");
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|final-logo\.svg|<svg|>\s*[AB]\s*</);
  });

  it("extracts PROSHOTS but still refuses to fake a logo without a real visual provider", async () => {
    const response = await postCommand("fais-moi un logo pour PROSHOTS ses des photographes sportifs");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_revision");
    expect(payload.brandName).toBe("PROSHOTS");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.artifactPaths).toEqual([]);
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|<svg/);
  });

  it("routes a page web request with a logo asset to a website preview, not the previous logo", async () => {
    const logoResponse = await postCommand("logo EKIDA");
    const logoPayload = await logoResponse.json();
    const websiteResponse = await postCommand("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");
    const websitePayload = await websiteResponse.json();

    expect(websiteResponse.status).toBe(200);
    expect(websitePayload.ok).toBe(true);
    expect(websitePayload.requestType).toBe("website");
    expect(websitePayload.deliverableType).toBe("website");
    expect(websitePayload.brandName).toBe("EKIDA");
    expect(websitePayload.title).toMatch(/EKIDA website|EKIDA/i);
    expect(websitePayload.primaryVisual).toContain("<svg");
    expect(websitePayload.primaryVisual).toContain("Preview site web");
    expect(websitePayload.primaryVisual).toContain("EKIDA");
    expect(websitePayload.primaryVisual).toMatch(/Collection|hero|Voir la collection|Essentiels de linge/i);
    expect(websitePayload.primaryVisual).not.toBe(logoPayload.primaryVisual);
    expect(String(websitePayload.primaryVisualPath ?? "")).not.toMatch(/final-logo\.svg$/);
    expect(websitePayload.title).not.toMatch(/^Logo /);
    expect(websitePayload.expert.runtime.finalStatus).toBe("completed");
    expect(websitePayload.expert.runtime.steps.map((step: { state: string }) => step.state)).toEqual(
      expect.arrayContaining(["queued", "planning", "generating", "reviewing", "validating"]),
    );
  });

  it("refuses missing prompts instead of returning fake success", async () => {
    const response = await postCommand("");
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.artifactPaths).toEqual([]);
  });

  it("accepts attachment-only messages and keeps attachment metadata internal", async () => {
    const response = await postCommandPayload({
      prompt: "",
      attachments: [{ id: "att-1", name: "brief.pdf", size: 1200, mimeType: "application/pdf", kind: "file", extension: "pdf" }],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.expert.inputAttachments).toEqual([expect.objectContaining({ name: "brief.pdf", kind: "file", extension: "pdf" })]);
  });

  it("keeps Node filesystem reads out of client CEO components", () => {
    const ceoComponentsDir = path.join(process.cwd(), "src", "components", "ceo");
    const files = fs.readdirSync(ceoComponentsDir).filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));
    const source = files.map((file) => fs.readFileSync(path.join(ceoComponentsDir, file), "utf-8")).join("\n");

    expect(source).not.toMatch(/from ["']fs["']|from ["']path["']|require\(["']fs["']\)|require\(["']path["']\)/);
    expect(source).not.toContain("generated-products/");
  });
});
