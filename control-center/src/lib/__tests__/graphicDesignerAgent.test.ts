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
    vi.stubEnv("IMAGE_PROVIDER", "");
    vi.stubEnv("DEEPINFRA_API_KEY", "");
    vi.stubEnv("DEEPINFRA_BASE_URL", "");
    vi.stubEnv("DEEPINFRA_IMAGE_MODEL", "");
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
    expect(result.shortMessage).toBe("Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.");
    expect(result.providerUsed).toBe("deepinfra_unavailable");
    expect(result.sourceType).toBe("provider_unavailable");
    expect(result.outputData).toBeNull();
    expect(result.artifactId).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/<svg|local_svg|fallback/i);
  });

  it("calls DeepInfra image API and creates a traceable artifact", async () => {
    const imageBase64 = Buffer.from("deepinfra-image".repeat(120)).toString("base64");
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
    const { runGraphicDesignerAgent } = await loadAgent();

    const result = await runGraphicDesignerAgent("Crée un logo professionnel premium pour une compagnie de construction.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(url).toBe("https://api.deepinfra.com/v1/openai/images/generations");
    expect(init.method).toBe("POST");
    expect(headers.get("authorization")).toMatch(/^Bearer /);
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      model: "black-forest-labs/FLUX-2-klein-9b",
      size: "1024x1024",
      n: 1,
    }));
    expect(result.status).toBe("completed");
    expect(result.shortMessage).toBe("Voici votre visuel final.");
    expect(result.providerUsed).toBe("deepinfra");
    expect(result.sourceType).toBe("deepinfra_image");
    expect(result.artifactId).toMatch(/^artifact-/);
    expect(result.artifactPath).toMatch(/^public\/generated-artifacts\/ceo-images\//);
    expect(result.artifactUrl).toMatch(/^\/generated-artifacts\/ceo-images\//);
    expect(fs.existsSync(path.resolve(process.cwd(), result.artifactPath ?? ""))).toBe(true);
    expect(result.outputData).toBe(`data:image/png;base64,${imageBase64}`);
    expect(JSON.stringify(result)).not.toContain("deepinfra-test-secret-value");

    const artifactStore = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "ceo-traceable-artifacts.json"), "utf-8"));
    expect(artifactStore[0]).toEqual(expect.objectContaining({
      missionId: result.missionId,
      providerUsed: "deepinfra",
      sourceType: "deepinfra_image",
      content: result.outputData,
      path: result.artifactPath,
      url: result.artifactUrl,
      promptUsed: expect.stringContaining("Premium professional graphic design"),
    }));
  });
});
