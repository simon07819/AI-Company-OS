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
  vi.stubEnv("IMAGE_PROVIDER", "");
  vi.stubEnv("NVIDIA_API_KEY", "");
  vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "");
  vi.stubEnv("NVIDIA_IMAGE_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

  it("does not return a local fake logo visual when no real visual provider is configured", async () => {
    const response = await postCommand("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.deliverableType).toBe("graphic_image");
    expect(payload.brandName).toBe("ELEVIO");
    expect(payload.title).toBe("Agent Graphiste prêt");
    expect(payload.summary).toBe("Agent Graphiste prêt, mais aucun moteur de rendu image n’est configuré.");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.sourceType).toBe("provider_unavailable");
    expect(payload.providerUsed).toBe("deepinfra_unavailable");
    expect(payload.artifactPaths).toEqual([]);
    expect(payload.expert.diagnostic.agent).toBe("graphic-designer");
    expect(payload.expert.diagnostic.artifactsCreated).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|final-logo\.svg|<svg|>\s*B\s*</);
  });

  it("routes visual requests to Agent Graphiste and returns a traceable DeepInfra image", async () => {
    const imageBase64 = Buffer.from("fake-image-content-over-one-kilobyte".repeat(80)).toString("base64");
    vi.stubEnv("DEEPINFRA_API_KEY", "deepinfra-test-secret-value");
    vi.stubGlobal("fetch", vi.fn(() => {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          data: [{ b64_json: imageBase64, mime_type: "image/png" }],
        })),
      });
    }));

    const response = await postCommand("Crée un logo professionnel premium pour une compagnie de construction.");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("completed");
    expect(payload.deliverableType).toBe("graphic_image");
    expect(payload.summary).toBe("Voici votre visuel final.");
    expect(payload.providerUsed).toBe("deepinfra");
    expect(payload.sourceType).toBe("deepinfra_image");
    expect(payload.primaryArtifactId).toMatch(/^artifact-/);
    expect(payload.artifactId).toBe(payload.primaryArtifactId);
    expect(payload.primaryVisual).toBe(`data:image/png;base64,${imageBase64}`);
    expect(payload.artifacts[0]).toEqual(expect.objectContaining({
      artifactId: payload.primaryArtifactId,
      sourceType: "deepinfra_image",
      providerUsed: "deepinfra",
    }));
    expect(payload.expert.diagnostic.agent).toBe("graphic-designer");
    expect(payload.expert.diagnostic.model).toBe("black-forest-labs/FLUX-2-klein-9b");
    expect(JSON.stringify(payload)).not.toMatch(/local_svg|Brand system|Marque à nommer|<svg|premium professional graphic design|Objectif:/i);
    expect(JSON.stringify(payload)).not.toContain("deepinfra-test-secret-value");
  });

  it("traces and blocks the EKIDA local SVG renderer path", async () => {
    const response = await postCommand("logo EKIDA sur fond noir");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.deliverableType).toBe("graphic_image");
    expect(payload.brandName).toBe("EKIDA");
    expect(payload.title).toBe("Agent Graphiste prêt");
    expect(payload.shortMessage).toBe("Agent Graphiste prêt, mais aucun moteur de rendu image n’est configuré.");
    expect(payload.primaryVisualPath).toBeNull();
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.artifactPaths).toEqual([]);
    expect(payload.expert.productionStatus).toBe("ceo_workflow_needs_action");
    expect(payload.expert.runtime.agent).toBe("graphic-designer");
    expect(payload.expert.runtime.providerUsed).toBe("deepinfra_unavailable");
    expect(payload.expert.diagnostic.sourceType).toBe("provider_unavailable");
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|final-logo\.svg|<svg|>\s*[AB]\s*</);
  });

  it("returns a useful logo brief when requested explicitly", async () => {
    const response = await postCommandPayload({ prompt: "logo EKIDA sur fond noir", action: "prepare_brief" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("completed");
    expect(payload.deliverableType).toBe("logo_brief");
    expect(payload.brandName).toBe("EKIDA");
    expect(payload.artifactId).toMatch(/^artifact-/);
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.summary).toMatch(/Brief logo - EKIDA|Directions créatives|Palette|Typographie/i);
    expect(payload.expert.diagnostic.sourceType).toBe("text");
    expect(payload.mission.events.map((event: { type: string }) => event.type)).toContain("action_requested");
    expect(JSON.stringify(payload)).not.toMatch(/<svg|Brand system|Marque à nommer/);
  });

  it("returns generator prompts when requested explicitly", async () => {
    const response = await postCommandPayload({ prompt: "fais-moi un logo pour PROSHOTS ses des photographes sportifs", action: "create_visual_prompts" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("completed");
    expect(payload.deliverableType).toBe("logo_prompts");
    expect(payload.brandName).toBe("PROSHOTS");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.summary).toMatch(/NVIDIA qwen-image|NVIDIA FLUX|NVIDIA visual-genai NIM|Guide designer humain/i);
    expect(payload.summary).not.toMatch(/PROSHOTS ses des photographes sportifs/);
    expect(payload.expert.diagnostic.sourceType).toBe("text");
  });

  it("only returns a local SVG prototype after an explicit user action", async () => {
    const response = await postCommandPayload({ prompt: "logo EKIDA sur fond noir", action: "request_local_prototype" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.title).toBe("Prototype SVG local");
    expect(payload.allowLocalPrototype).toBe(true);
    expect(payload.sourceType).toBe("local_svg");
    expect(payload.mission.sourceType).toBe("local_svg");
    expect(payload.artifactId).toMatch(/^artifact-/);
    expect(payload.primaryArtifactId).toBe(payload.artifactId);
    expect(payload.primaryVisual).toContain("<svg");
    expect(payload.summary).toMatch(/demande explicite/i);
    expect(payload.summary).toMatch(/pas un livrable de provider image/i);
    expect(payload.expert.diagnostic.sourceType).toBe("local_svg");
  });

  it("traces modify_current_deliverable without creating a fake logo", async () => {
    const response = await postCommandPayload({ prompt: "logo EKIDA sur fond noir", action: "modify_current_deliverable" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.sourceType).toBe("none");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.mission.events.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining(["action_requested", "modification_waiting_for_instruction"]),
    );
    expect(JSON.stringify(payload)).not.toMatch(/<svg|Brand system|Marque à nommer/);
  });

  it("extracts PROSHOTS but does not generate a fake visual without a real visual provider", async () => {
    const response = await postCommand("fais-moi un logo pour PROSHOTS ses des photographes sportifs");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.brandName).toBe("PROSHOTS");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.expert.diagnostic.providerUsed).toBe("deepinfra_unavailable");
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
    expect(websitePayload.artifactId).toMatch(/^artifact-/);
    expect(websitePayload.deliverables[0]).toEqual(expect.objectContaining({
      artifactId: websitePayload.artifactId,
      sourceType: "code_artifact",
      providerUsed: "artifact_pipeline",
    }));
    expect(websitePayload.brandName).toBe("EKIDA");
    expect(websitePayload.title).toMatch(/EKIDA website|EKIDA/i);
    expect(websitePayload.primaryVisual).toContain("<svg");
    expect(websitePayload.primaryVisual).toContain("Preview site web");
    expect(websitePayload.primaryVisual).toContain("EKIDA");
    expect(websitePayload.primaryVisual).toMatch(/Collection|hero|Voir la collection|Essentiels de linge/i);
    expect(websitePayload.primaryVisual).not.toBe(logoPayload.primaryVisual);
    expect(String(websitePayload.primaryVisualPath ?? "")).not.toMatch(/final-logo\.svg$/);
    expect(websitePayload.title).not.toMatch(/^Logo /);
    expect(websitePayload.expert.runtime.status).toBe("completed");
    expect(websitePayload.expert.runtime.playbook.id).toBe("website-team-playbook");
    expect(websitePayload.expert.runtime.agentRuns.map((run: { agentId: string }) => run.agentId)).toEqual([
      "ceo",
      "product_owner",
      "ux_strategist",
      "ui_designer",
      "frontend_architect",
      "critic",
      "qa",
      "reviewer",
      "artifact_manager",
    ]);
    expect(websitePayload.expert.runtime.steps.map((step: { label: string }) => step.label)).toEqual(
      expect.arrayContaining(["analyse demande", "architecture", "design direction", "preview", "review"]),
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
    expect(source).not.toContain("runDesignTeamWorkflow");
  });
});
