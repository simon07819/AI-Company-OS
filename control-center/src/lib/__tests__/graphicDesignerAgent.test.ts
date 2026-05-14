import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtimeRoot = "";

async function loadAgent() {
  vi.resetModules();
  return import("@/lib/agents/graphic-designer/graphicDesignerAgent");
}

describe("Agent Graphiste IA", () => {
  beforeEach(() => {
    runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-graphic-agent-"));
    vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
    vi.stubEnv("DEEPINFRA_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  });

  it("routes graphic keywords to Agent Graphiste", async () => {
    const { isGraphicDesignerRequest } = await loadAgent();

    expect(isGraphicDesignerRequest("Crée un logo professionnel premium pour une compagnie de construction.")).toBe(true);
    expect(isGraphicDesignerRequest("Prépare une bannière LinkedIn")).toBe(true);
    expect(isGraphicDesignerRequest("Rédige un court email")).toBe(false);
  });

  it("returns a clean provider-missing response without local fallback", async () => {
    const { runGraphicDesignerAgent } = await loadAgent();

    const result = await runGraphicDesignerAgent("Crée un logo professionnel premium pour une compagnie de construction.");

    expect(result.status).toBe("needs_action");
    expect(result.shortMessage).toBe("Agent Graphiste prêt, mais aucun moteur de rendu image n’est configuré.");
    expect(result.providerUsed).toBe("deepinfra_unavailable");
    expect(result.sourceType).toBe("provider_unavailable");
    expect(result.outputData).toBeNull();
    expect(result.artifactId).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/<svg|local_svg|fallback/i);
  });

  it("calls DeepInfra image API and creates a traceable artifact", async () => {
    const imageBase64 = Buffer.from("deepinfra-image".repeat(120)).toString("base64");
    vi.stubEnv("DEEPINFRA_API_KEY", "deepinfra-test-secret-value");
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        data: [{ b64_json: imageBase64, mime_type: "image/png" }],
      })),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { runGraphicDesignerAgent } = await loadAgent();

    const result = await runGraphicDesignerAgent("Crée un logo professionnel premium pour une compagnie de construction.");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepinfra.com/v1/openai/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Authorization": expect.stringMatching(/^Bearer /),
        }),
      }),
    );
    expect(result.status).toBe("completed");
    expect(result.shortMessage).toBe("Voici votre visuel final.");
    expect(result.providerUsed).toBe("deepinfra");
    expect(result.sourceType).toBe("deepinfra_image");
    expect(result.artifactId).toMatch(/^artifact-/);
    expect(result.outputData).toBe(`data:image/png;base64,${imageBase64}`);
    expect(JSON.stringify(result)).not.toContain("deepinfra-test-secret-value");

    const artifactStore = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "ceo-traceable-artifacts.json"), "utf-8"));
    expect(artifactStore[0]).toEqual(expect.objectContaining({
      missionId: result.missionId,
      providerUsed: "deepinfra",
      sourceType: "deepinfra_image",
      content: result.outputData,
    }));
  });
});
