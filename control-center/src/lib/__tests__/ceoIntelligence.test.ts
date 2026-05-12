import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("CEO intelligence layer", () => {
  it("extracts ELEVIO as brandName and never uses Nouvelle Marque AI", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { analyzeCeoIntent } = await import("@/lib/ai/ceoIntent");

    const result = await analyzeCeoIntent("je veux un logo pour une compagnie qui s'appelle ELEVIO");

    expect(result.requestType).toBe("logo");
    expect(result.brandName).toBe("ELEVIO");
    expect(result.goal).toContain("logo");
    expect(JSON.stringify(result)).not.toContain("Nouvelle Marque AI");
  });

  it("detects a SaaS request and extracts gym management features", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { analyzeCeoIntent } = await import("@/lib/ai/ceoIntent");

    const result = await analyzeCeoIntent("je veux un SaaS pour gérer des gyms");

    expect(result.requestType).toBe("saas");
    expect(result.projectName).toBe("Gym management SaaS");
    expect(result.industry).toBe("fitness");
    expect(result.coreFeatures).toEqual(expect.arrayContaining(["membres", "abonnements", "horaires", "coachs", "paiements", "dashboard"]));
  });

  it("detects website requests", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { analyzeCeoIntent } = await import("@/lib/ai/ceoIntent");

    const result = await analyzeCeoIntent("je veux un site web pour un restaurant");

    expect(result.requestType).toBe("website");
    expect(result.industry).toBe("restaurant");
    expect(result.goal).toMatch(/site web/i);
  });

  it("returns an honest prototype fallback when NVIDIA is unavailable", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const { analyzeCeoIntent } = await import("@/lib/ai/ceoIntent");
    const { planCeoExecution } = await import("@/lib/ai/ceoPlanner");

    const intent = await analyzeCeoIntent("je veux un SaaS pour gérer des gyms");
    const plan = await planCeoExecution(intent);

    expect(intent.mode).toBe("prototype");
    expect(intent.prototypeNotice).toContain("mode prototype");
    expect(plan.mode).toBe("prototype");
    expect(plan.prototypeNotice).toContain("mode prototype");
    expect(plan.expectedArtifacts.some((artifact) => artifact.type === "project_scaffold")).toBe(true);
  });

  it("does not log or expose NVIDIA secrets in fallback warnings", async () => {
    const secret = "nvapi-super-secret-value-1234567890";
    vi.stubEnv("NVIDIA_API_KEY", "");
    const consoleSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");
    const { analyzeCeoIntent } = await import("@/lib/ai/ceoIntent");

    const result = await analyzeCeoIntent("je veux un logo pour une compagnie qui s'appelle ELEVIO");
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("NVIDIA_API_KEY");
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
