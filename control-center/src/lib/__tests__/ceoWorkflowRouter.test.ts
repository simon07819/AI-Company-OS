import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtimeRoot = "";

async function loadRouter() {
  vi.resetModules();
  return import("@/lib/agents/ceoWorkflowRouter");
}

function readArtifacts() {
  const file = path.join(runtimeRoot, "ceo-traceable-artifacts.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

describe("CEO multi-agent workflow router", () => {
  beforeEach(() => {
    runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-ceo-workflow-"));
    vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
    vi.stubEnv("IMAGE_PROVIDER", "");
    vi.stubEnv("DEEPINFRA_API_KEY", "");
    vi.stubEnv("DEEPINFRA_BASE_URL", "");
    vi.stubEnv("DEEPINFRA_IMAGE_MODEL", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "");
    vi.stubEnv("NVIDIA_IMAGE_MODEL", "");
    vi.stubEnv("CODEX_PERSONAL_ACCOUNT_ENABLED", "");
    vi.stubEnv("CODEX_AGENT_ENABLED", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  });

  it("routes each mission type to the expected playbook", async () => {
    const { detectCeoWorkflowType } = await loadRouter();

    expect(detectCeoWorkflowType("Crée un logo premium pour une compagnie de construction")).toBe("graphic");
    expect(detectCeoWorkflowType("Crée une image site pour la page accueil")).toBe("assets");
    expect(detectCeoWorkflowType("Crée un module React de facturation")).toBe("code");
    expect(detectCeoWorkflowType("Rédige un email de vente")).toBe("copywriting");
    expect(detectCeoWorkflowType("Quelle est la priorité produit ?")).toBe("none");
  });

  it("keeps DeepInfra disabled until configured and does not create a fallback", async () => {
    const { runCeoWorkflow } = await loadRouter();

    const result = await runCeoWorkflow("Crée un logo premium pour une compagnie de construction");

    expect(result?.workflowType).toBe("graphic");
    expect(result?.status).toBe("needs_action");
    expect(result?.providerUsed).toBe("deepinfra_unavailable");
    expect(result?.sourceType).toBe("provider_unavailable");
    expect(result?.artifactId).toBeNull();
    expect(result?.runtime.critic.passed).toBe(false);
    expect(result?.runtime.reviewer.decision).toBe("needs_action");
    expect(JSON.stringify(result)).not.toMatch(/<svg|local_svg/i);
  });

  it("calls DeepInfra only when configured and stores a traceable image artifact", async () => {
    const imageBase64 = Buffer.from("deepinfra-router-image".repeat(90)).toString("base64");
    vi.stubEnv("IMAGE_PROVIDER", "deepinfra");
    vi.stubEnv("DEEPINFRA_API_KEY", "deepinfra-test-secret-value");
    vi.stubEnv("DEEPINFRA_BASE_URL", "https://api.deepinfra.com/v1/openai");
    vi.stubEnv("DEEPINFRA_IMAGE_MODEL", "black-forest-labs/FLUX-2-klein-9b");
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      data: [{ b64_json: imageBase64, mime_type: "image/png" }],
    }), {
      ok: true,
      headers: { "Content-Type": "application/json" },
    })));
    vi.stubGlobal("fetch", fetchMock);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { runCeoWorkflow } = await loadRouter();

    const result = await runCeoWorkflow("Crée un logo premium pour une compagnie de construction");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result?.workflowType).toBe("graphic");
    expect(result?.providerUsed).toBe("deepinfra");
    expect(result?.sourceType).toBe("deepinfra_image");
    expect(result?.artifactId).toMatch(/^artifact-/);
    expect(result?.runtime.timeline.map((step) => step.agent)).toEqual([
      "ceo",
      "product_owner",
      "ux_designer",
      "graphic-designer",
      "qa",
      "critic",
      "reviewer",
      "artifact_manager",
    ]);
    expect(readArtifacts()[0]).toEqual(expect.objectContaining({
      missionId: result?.missionId,
      providerUsed: "deepinfra",
      sourceType: "deepinfra_image",
    }));
    expect(JSON.stringify(result)).not.toContain("deepinfra-test-secret-value");
  });

  it("uses NVIDIA only for assets and stores a traceable asset artifact when configured", async () => {
    const imageBase64 = Buffer.from("nvidia-asset-image".repeat(90)).toString("base64");
    vi.stubEnv("IMAGE_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "nvidia-test-secret-value");
    vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "https://integrate.api.nvidia.com/v1/images/generations");
    vi.stubEnv("NVIDIA_IMAGE_MODEL", "black-forest-labs/flux.1-dev");
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => "application/json" },
      text: () => Promise.resolve(JSON.stringify({ data: [{ b64_json: imageBase64, mime_type: "image/png" }] })),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { runCeoWorkflow } = await loadRouter();

    const result = await runCeoWorkflow("Crée une image site premium pour la page accueil");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result?.workflowType).toBe("assets");
    expect(result?.agent).toBe("assets-agent");
    expect(result?.providerUsed).toBe("nvidia");
    expect(result?.sourceType).toBe("nvidia_image");
    expect(result?.artifactId).toMatch(/^artifact-/);
    expect(readArtifacts()[0]).toEqual(expect.objectContaining({
      missionId: result?.missionId,
      providerUsed: "nvidia",
      sourceType: "nvidia_image",
    }));
    expect(JSON.stringify(result)).not.toContain("nvidia-test-secret-value");
  });

  it("keeps Agent Coder unavailable until the Codex personal provider is configured", async () => {
    const { runCeoWorkflow } = await loadRouter();

    const result = await runCeoWorkflow("Crée un module React de facturation");

    expect(result?.workflowType).toBe("code");
    expect(result?.agent).toBe("coder-agent");
    expect(result?.status).toBe("needs_action");
    expect(result?.providerUsed).toBe("codex_unavailable");
    expect(result?.sourceType).toBe("provider_unavailable");
    expect(result?.artifactId).toBeNull();
    expect(result?.runtime.critic.passed).toBe(false);
  });

  it("creates a traceable code artifact through Agent Coder when Codex is configured", async () => {
    vi.stubEnv("CODEX_AGENT_ENABLED", "true");
    const { runCeoWorkflow } = await loadRouter();

    const result = await runCeoWorkflow("Crée un module React de facturation");

    expect(result?.workflowType).toBe("code");
    expect(result?.agent).toBe("coder-agent");
    expect(result?.status).toBe("completed");
    expect(result?.providerUsed).toBe("codex_personal");
    expect(result?.sourceType).toBe("codex_code");
    expect(result?.artifactId).toMatch(/^artifact-/);
    expect(result?.outputData).toMatch(/export default function GeneratedModule/);
    expect(result?.runtime.critic.passed).toBe(true);
    expect(result?.runtime.reviewer.decision).toBe("approved");
    expect(readArtifacts()[0]).toEqual(expect.objectContaining({
      missionId: result?.missionId,
      providerUsed: "codex_personal",
      sourceType: "codex_code",
      type: "code",
    }));
  });
});
