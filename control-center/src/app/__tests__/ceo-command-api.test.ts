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

  it("does not return a local fake logo visual when no real visual provider is configured", async () => {
    const response = await postCommand("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.mission.status).toBe("needs_action");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.brandName).toBe("ELEVIO");
    expect(payload.title).toBe("Aucun générateur visuel réel branché");
    expect(payload.summary).toBe("Aucun générateur visuel réel branché. Je peux préparer le brief, les prompts et les directions créatives.");
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.sourceType).toBe("none");
    expect(payload.mission.sourceType).toBe("none");
    expect(payload.mission.providerResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capability: "image", success: false, sourceType: "provider_unavailable" }),
      ]),
    );
    expect(payload.mission.agentRuns.map((run: { agentId: string }) => run.agentId)).toEqual(
      expect.arrayContaining(["planner", "brand_strategist", "creative_director", "visual_prompt_engineer", "critic", "reviewer"]),
    );
    expect(payload.mission.criticResult.passed).toBe(true);
    expect(payload.mission.reviewerResult.passed).toBe(true);
    expect(payload.deliverables.map((deliverable: { title: string }) => deliverable.title)).toEqual(
      expect.arrayContaining(["Brief disponible", "Directions disponibles", "Prompts disponibles"]),
    );
    expect(payload.artifactPaths).toEqual([]);
    expect(payload.expert.diagnostic.localRendererFile).toBe("src/lib/design-team/logoWorkflow.ts");
    expect(payload.expert.diagnostic.nvidiaCalled).toBe(false);
    expect(payload.expert.diagnostic.artifactsCreated).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/Brand system|Marque à nommer|final-logo\.svg|<svg|>\s*B\s*</);
  });

  it("traces and blocks the EKIDA local SVG renderer path", async () => {
    const response = await postCommand("logo EKIDA sur fond noir");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("needs_action");
    expect(payload.deliverableType).toBe("logo");
    expect(payload.brandName).toBe("EKIDA");
    expect(payload.title).toBe("Aucun générateur visuel réel branché");
    expect(payload.shortMessage).toBeUndefined();
    expect(payload.primaryVisualPath).toBeNull();
    expect(payload.primaryVisual).toBeNull();
    expect(payload.primaryArtifactId).toBeNull();
    expect(payload.artifactPaths).toEqual([]);
    expect(payload.expert.productionStatus).toBe("blocked_no_real_visual_provider");
    expect(payload.expert.runtime.status).toBe("needs_action");
    expect(payload.expert.runtime.steps.map((step: { label: string }) => step.label)).toEqual(
      expect.arrayContaining(["analyse demande", "brief", "directions créatives", "prompts visuels", "validation provider", "livrable ou action requise"]),
    );
    expect(payload.expert.runtime.providerUsed).toBe("none");
    expect(payload.expert.diagnostic.sourceType).toBe("none");
    expect(payload.expert.diagnostic.disabledSource).toBe("local_svg_renderer");
    expect(payload.expert.diagnostic.nvidiaCalled).toBe(false);
    expect(payload.expert.companyWorkflow.hiddenDetails.decisions).toContain("Source locale du faux SVG identifiée: src/lib/design-team/logoWorkflow.ts.");
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
    expect(payload.summary).toMatch(/Midjourney|Ideogram|DALL-E|Guide designer humain/i);
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
    expect(payload.expert.diagnostic.providerUsed).toBe("none");
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
