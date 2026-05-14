import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCompanyMemoryContext,
  inferPreferencesFromCommand,
  recordCompanyMemory,
  recordUserMemoryAction,
} from "@/lib/memory/companyMemory";
import { createMissionRuntime, runMissionAgents, addDeliverable, setMissionStatus } from "@/lib/mission-runtime/missionRuntime";
import { createTraceableImageArtifact } from "@/lib/providers/providerRegistry";

let runtimeRoot = "";

beforeEach(() => {
  runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "company-memory-"));
  vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
});

describe("company memory", () => {
  it("loads existing memory into mission context", () => {
    recordUserMemoryAction({
      action: "avoid_style",
      missionId: "mission-old",
      missionType: "logo",
      text: "bleu dashboard",
      brandName: "EKIDA",
    });

    const mission = createMissionRuntime("logo EKIDA noir ChatGPT pas bleu");

    expect(mission.memoryContext.avoidStyles).toContain("bleu dashboard");
    expect(mission.memoryContext.summary).toMatch(/À éviter: bleu dashboard/);
  });

  it("writes decisions after review", () => {
    const mission = createMissionRuntime("logo EKIDA noir ChatGPT pas bleu");
    addDeliverable(mission, {
      type: "visual_prompts",
      title: "Prompts disponibles",
      content: "Prompts NVIDIA efficaces pour EKIDA noir ChatGPT.",
      mediaType: "text",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      artifactId: "artifact-prompts",
    });
    mission.sourceType = "local_storage";
    mission.providerUsed = "local_storage";
    setMissionStatus(mission, "reviewing");
    runMissionAgents(mission, { imageProviderAvailable: false });

    const context = buildCompanyMemoryContext({ missionType: "logo", command: "logo EKIDA" });
    expect(mission.memoryWrites.length).toBeGreaterThan(0);
    expect(context.preferences).toContain("style noir ChatGPT");
    expect(context.avoidStyles).toContain("bleu");
    expect(context.effectivePrompts.join("\n")).toContain("Prompts NVIDIA efficaces");
  });

  it("reuses style refusals and no-blue preference in agent context", () => {
    recordCompanyMemory({
      companyId: "default-company",
      missionId: "mission-old",
      missionType: "website",
      userPreferences: ["style noir ChatGPT"],
      acceptedDecisions: [],
      visualStylePreferred: ["style noir ChatGPT"],
      visualStyleRejected: ["bleu", "dashboard bleu"],
      repeatedCritiques: [],
      retainedBranding: [],
      effectivePrompts: [],
      acceptedArtifacts: [],
      rejectedArtifacts: [],
      reviewerNotes: ["éviter bleu"],
      source: "user_action",
    });

    const mission = createMissionRuntime("Je veux un site web EKIDA");
    runMissionAgents(mission, { imageProviderAvailable: false });
    const combinedAgentInputs = mission.agentRuns.map((run) => `${run.input.playbookId}\n${run.input.memoryContext ?? ""}`).join("\n");

    expect(mission.memoryContext.preferences).toContain("style noir ChatGPT");
    expect(mission.memoryContext.avoidStyles).toEqual(expect.arrayContaining(["bleu", "dashboard bleu"]));
    expect(mission.memoryContext.summary).toMatch(/style noir ChatGPT|bleu/);
    expect(combinedAgentInputs).toContain("website-team-playbook");
    expect(combinedAgentInputs).toContain("style noir ChatGPT");
    expect(combinedAgentInputs).toContain("dashboard bleu");
  });

  it("detects no blue and black ChatGPT from command text", () => {
    const inferred = inferPreferencesFromCommand("je veux noir ChatGPT, pas bleu");
    expect(inferred.preferences).toContain("style noir ChatGPT");
    expect(inferred.rejected).toContain("bleu");
  });

  it("retains approved image artifact style for future graphic generations", () => {
    const imageDataUrl = `data:image/png;base64,${Buffer.from("approved-ekida-direction".repeat(120)).toString("base64")}`;
    const artifact = createTraceableImageArtifact({
      missionId: "mission-ekida-approved",
      type: "graphic_image",
      title: "Logo EKIDA Canada approuvé",
      sourceType: "deepinfra_image",
      providerUsed: "deepinfra",
      imageDataUrl,
      promptUsed: "minimal black and white EKIDA CANADA logo, sharp geometric maple-inspired mark",
      metadata: {
        styleReference: "minimal black and white, sharp geometric maple-inspired mark",
      },
    });

    recordUserMemoryAction({
      action: "retain_direction",
      missionId: "mission-ekida-approved",
      missionType: "graphic_image",
      text: "Direction logo EKIDA Canada validée",
      artifactId: artifact.artifactId,
      brandName: "EKIDA CANADA",
    });

    const context = buildCompanyMemoryContext({ missionType: "graphic", command: "Crée un logo EKIDA CANADA similaire" });
    expect(context.acceptedArtifacts).toContain(artifact.artifactId);
    expect(context.retainedBranding.join("\n")).toContain("EKIDA CANADA");
    expect(context.effectivePrompts.join("\n")).toContain("minimal black and white EKIDA CANADA logo");
    expect(context.summary).toContain("Références visuelles approuvées");
    expect(context.summary).toContain("sharp geometric maple-inspired mark");
  });
});
