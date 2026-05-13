import { describe, expect, it } from "vitest";
import {
  critiqueMissionOutput,
  reviewMissionOutput,
  runMissionAgentFlow,
  type AgentInput,
} from "@/lib/agents/agentRegistry";

function input(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    missionId: "mission-test",
    missionType: "logo",
    command: "logo EKIDA",
    sourceType: "none",
    providerUsed: "none",
    imageProviderAvailable: false,
    localPrototypeRequested: false,
    deliverables: [{
      type: "brief",
      title: "Brief disponible",
      content: "Brief logo EKIDA avec directions creatives, contraintes, prompts et prochaines actions utiles.",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      artifactId: "artifact-brief",
    }],
    attempt: 0,
    ...overrides,
  };
}

describe("agent registry critic and reviewer", () => {
  it("blocks a final logo when no real image provider exists", () => {
    const result = critiqueMissionOutput(input({
      deliverables: [{ title: "Logo final", content: "Voici le logo final EKIDA.", sourceType: "none", providerUsed: "none" }],
    }));

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("blocked_final_logo_without_image_provider");
  });

  it("blocks legacy Marque a nommer placeholder output", () => {
    const result = critiqueMissionOutput(input({
      deliverables: [{ title: "Brief", content: "Marque à nommer", sourceType: "local_storage", providerUsed: "local_storage" }],
    }));

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("blocked_placeholder_marque_a_nommer");
  });

  it("blocks automatic local_svg when the user did not request a local prototype", () => {
    const result = critiqueMissionOutput(input({
      sourceType: "local_svg",
      providerUsed: "local_svg_renderer_explicit",
      localPrototypeRequested: false,
      deliverables: [{ title: "Prototype", content: "<svg viewBox=\"0 0 10 10\" />", sourceType: "local_svg", providerUsed: "local_svg_renderer_explicit" }],
    }));

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("blocked_automatic_local_svg");
  });

  it("retries generic output at most twice", () => {
    const flow = runMissionAgentFlow({
      missionId: "mission-test",
      missionType: "general",
      command: "Prepare something",
      sourceType: "none",
      providerUsed: "none",
      imageProviderAvailable: false,
      deliverables: [{ title: "Placeholder", content: "placeholder", sourceType: "none", providerUsed: "none" }],
      maxRetries: 2,
    });

    expect(flow.retries).toBe(2);
    expect(flow.retryEvents).toHaveLength(2);
    expect(flow.critic.issues).toEqual(expect.arrayContaining(["blocked_placeholder_or_generic"]));
  });

  it("reviewer refuses missions without sourceType or providerUsed", () => {
    const base = input({ sourceType: "unknown", providerUsed: "unknown" });
    const critic = critiqueMissionOutput(base);
    const review = reviewMissionOutput(base, critic);

    expect(review.passed).toBe(false);
    expect(review.issues).toEqual(expect.arrayContaining(["missing_source_type", "missing_provider_used"]));
  });

  it("accepts logo support flow with brief and prompts but no fake visual", () => {
    const result = critiqueMissionOutput(input({
      deliverables: [{
        type: "visual_prompts",
        title: "Prompts disponibles",
        content: "Prompts visuels pour EKIDA, sans image generee et avec action requise pour un provider image.",
        sourceType: "local_storage",
        providerUsed: "local_storage",
        artifactId: "artifact-prompts",
      }],
    }));

    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
