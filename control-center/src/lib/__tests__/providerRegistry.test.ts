import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTraceableArtifact,
  getProviderRegistry,
  hasImageProvider,
  runImageProvider,
  runTextProvider,
} from "@/lib/providers/providerRegistry";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider registry", () => {
  it("reports image providers as unavailable instead of inventing one", () => {
    vi.stubEnv("IMAGE_PROVIDER", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "");
    const registry = getProviderRegistry();

    expect(hasImageProvider()).toBe(false);
    expect(registry.image.available).toBe(false);
    expect(registry.image.providerUsed).toBe("none");
    expect(registry.image.preparedProviders).toEqual(["nvidia:qwen-image", "nvidia:flux", "nvidia:visual-genai-nim"]);
  });

  it("keeps NVIDIA image unavailable when endpoint config is missing", async () => {
    vi.stubEnv("IMAGE_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "nvapi-test-secret-value");
    vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "");

    const registry = getProviderRegistry();
    const result = await runImageProvider({
      missionId: "mission-test",
      prompt: "logo EKIDA",
      kind: "logo",
      brandName: "EKIDA",
    });

    expect(hasImageProvider()).toBe(false);
    expect(registry.image.available).toBe(false);
    expect(registry.image.providerUsed).toBe("nvidia");
    expect(result.success).toBe(false);
    expect(result.providerUsed).toBe("nvidia_unavailable");
    expect(result.sourceType).toBe("provider_unavailable");
    expect(JSON.stringify(result)).not.toContain("nvapi-test-secret-value");
  });

  it("uses NVIDIA as the image provider when configured", async () => {
    vi.stubEnv("IMAGE_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "nvapi-test-secret-value");
    vi.stubEnv("NVIDIA_IMAGE_ENDPOINT", "https://mock.nvidia.test/v1/images/generations");
    vi.stubEnv("NVIDIA_IMAGE_MODEL", "qwen-image");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [{ b64_json: "ZmFrZS1pbWFnZQ==", mime_type: "image/png" }],
      }),
    })));

    const registry = getProviderRegistry();
    const result = await runImageProvider({
      missionId: "mission-test",
      prompt: "logo EKIDA",
      kind: "logo",
      brandName: "EKIDA",
    });

    expect(hasImageProvider()).toBe(true);
    expect(registry.image.available).toBe(true);
    expect(registry.image.providerUsed).toBe("nvidia");
    expect(registry.image.sourceType).toBe("nvidia_image");
    expect(result.success).toBe(true);
    expect(result.providerUsed).toBe("nvidia");
    expect(result.sourceType).toBe("nvidia_image");
    expect(result.output).toBe("data:image/png;base64,ZmFrZS1pbWFnZQ==");
    expect(result.model).toBe("qwen-image");
    expect(JSON.stringify(result)).not.toContain("nvapi-test-secret-value");
  });

  it("returns providerUnavailable for NVIDIA text when credentials are absent", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");

    const result = await runTextProvider({
      system: "Reason only.",
      user: "Prepare a brief.",
      purpose: "test",
    });

    expect(result.success).toBe(false);
    expect(result.providerUsed).toBe("nvidia_unavailable");
    expect(result.sourceType).toBe("provider_unavailable");
    expect(result.capability).toBe("text");
    expect(JSON.stringify(result)).not.toContain("NVIDIA_API_KEY");
  });

  it("uses NVIDIA as a text provider when configured without exposing secrets", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "nvapi-test-secret-value");
    vi.stubEnv("NVIDIA_MODEL", "nvidia/test-model");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: "Brief texte NVIDIA." } }],
        usage: { total_tokens: 12 },
      }),
    })));

    const result = await runTextProvider({
      system: "Reason only.",
      user: "Prepare a brief.",
      purpose: "test",
    });

    expect(result.success).toBe(true);
    expect(result.providerUsed).toBe("nvidia");
    expect(result.sourceType).toBe("nvidia_text");
    expect(result.capability).toBe("text");
    expect(result.output).toBe("Brief texte NVIDIA.");
    expect(JSON.stringify(result)).not.toContain("nvapi-test-secret-value");
  });

  it("creates local traceable artifacts with provider metadata", () => {
    const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "provider-registry-"));
    vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
    const artifact = createTraceableArtifact({
      missionId: "mission-test",
      type: "brief",
      title: "Brief",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      content: "Brief content",
    });

    expect(artifact.artifactId).toMatch(/^artifact-/);
    expect(artifact.missionId).toBe("mission-test");
    expect(artifact.providerUsed).toBe("local_storage");
    expect(artifact.sourceType).toBe("local_storage");
    expect(artifact.createdAt).toEqual(expect.any(String));
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  });
});
