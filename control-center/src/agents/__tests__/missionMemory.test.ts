import { describe, expect, it, beforeEach } from "vitest";
import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { createMissionMemoryStore, clearMissionMemoryStore, reusableAssetFromMission } from "@/agents/memory/mission-memory-store";
import { decideContextReuse } from "@/agents/memory/reuse-policy";
import { selectContextForAgent } from "@/agents/memory/context-selector";
import { sanitizeMemoryForSimpleMode } from "@/agents/memory/memory-sanitizer";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";

beforeEach(() => clearMissionMemoryStore());

describe("mission memory store", () => {
  it("adds turns, approved missions and reusable assets by brand", () => {
    const store = createMissionMemoryStore({ conversationId: "conv-a" });
    store.addTurn({ id: "turn-a", userPrompt: "logo EKIDA", status: "pending" });
    const memory = store.addApprovedMission({
      id: "memory-a",
      turnId: "turn-a",
      missionId: "mission-a",
      workOrderId: "work-a",
      deliverableType: "logo",
      brandName: "EKIDA",
      primaryArtifactId: "logo-a",
      primaryArtifactFingerprint: "fp-a",
      reusableAssets: [reusableAssetFromMission({
        id: "asset-a",
        deliverableType: "logo",
        brandName: "EKIDA",
        primaryArtifactId: "logo-a",
        primaryArtifactFingerprint: "fp-a",
      })],
      summary: "Logo EKIDA approuvé.",
    });

    expect(memory.hiddenDetailsRef).toBeUndefined();
    expect(store.lastApprovedDeliverable()?.primaryArtifactId).toBe("logo-a");
    expect(store.assetsByBrandName("EKIDA")).toHaveLength(1);
    expect(sanitizeMemoryForSimpleMode(store.snapshot())).toEqual({
      conversationId: "conv-a",
      turns: [{ id: "turn-a", userPrompt: "logo EKIDA", deliverableType: undefined, brandName: undefined, visibleOutputKind: undefined, status: "pending" }],
    });
  });

  it("isolates conversations and blocks secret markers", () => {
    const a = createMissionMemoryStore({ conversationId: "conv-a" });
    const b = createMissionMemoryStore({ conversationId: "conv-b" });
    a.addTurn({ id: "turn-a", userPrompt: "logo EKIDA", status: "pending" });

    expect(b.snapshot().turns).toHaveLength(0);
    expect(() => a.addTurn({ id: "bad", userPrompt: "NVIDIA_API_KEY=secret", status: "pending" })).toThrow(/secret/i);
  });
});

describe("context reuse policy", () => {
  function snapshotWithLogo() {
    const store = createMissionMemoryStore({ conversationId: "conv-policy" });
    store.addApprovedMission({
      id: "memory-logo",
      turnId: "turn-logo",
      missionId: "mission-logo",
      workOrderId: "work-logo",
      deliverableType: "logo",
      brandName: "EKIDA",
      primaryArtifactId: "logo-ekida",
      primaryArtifactFingerprint: "fp-logo",
      reusableAssets: [reusableAssetFromMission({
        id: "asset-logo",
        deliverableType: "logo",
        brandName: "EKIDA",
        primaryArtifactId: "logo-ekida",
        primaryArtifactFingerprint: "fp-logo",
      })],
      summary: "Logo EKIDA approuvé.",
    });
    return store.snapshot();
  }

  it("allows compatible logo modifications", () => {
    const workOrder = createWorkOrderFromPrompt("modifie ce logo en noir", { deliverableType: "logo", primaryVisual: "<svg>EKIDA</svg>", brandName: "EKIDA" });
    const selection = decideContextReuse({ currentPrompt: "modifie ce logo en noir", currentWorkOrder: workOrder, memory: snapshotWithLogo() });

    expect(selection.isModification).toBe(true);
    expect(selection.selectedPreviousArtifactId).toBe("logo-ekida");
  });

  it("uses a logo as secondary asset for website but forbids it as primary", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida");
    const selection = decideContextReuse({ currentPrompt: workOrder.originalPrompt, currentWorkOrder: workOrder, memory: snapshotWithLogo() });

    expect(selection.currentDeliverableType).not.toBe("logo");
    expect(selection.selectedPreviousArtifactId).toBeUndefined();
    expect(selection.selectedReusableAssets[0]?.artifactId).toBe("logo-ekida");
    expect(selection.forbiddenPrimaryArtifactFingerprints).toContain("fp-logo");
  });

  it("forbids previous brand primary when brand changes", () => {
    const workOrder = createWorkOrderFromPrompt("logo PROSHOTS pour photographes sportifs");
    const selection = decideContextReuse({ currentPrompt: workOrder.originalPrompt, currentWorkOrder: workOrder, memory: snapshotWithLogo() });

    expect(selection.selectedPreviousArtifactId).toBeUndefined();
    expect(selection.forbiddenPrimaryArtifactFingerprints).toContain("fp-logo");
  });
});

describe("context selector and runtime memory behavior", () => {
  it("selects agent-specific context without hidden details", () => {
    const store = createMissionMemoryStore({ conversationId: "conv-context" });
    store.addApprovedMission({
      id: "memory-logo",
      turnId: "turn-logo",
      missionId: "mission-logo",
      workOrderId: "work-logo",
      deliverableType: "logo",
      brandName: "EKIDA",
      primaryArtifactId: "logo-ekida",
      primaryArtifactFingerprint: "fp-logo",
      reusableAssets: [reusableAssetFromMission({
        id: "asset-logo",
        deliverableType: "logo",
        brandName: "EKIDA",
        primaryArtifactId: "logo-ekida",
        primaryArtifactFingerprint: "fp-logo",
      })],
      summary: "Logo EKIDA approuvé.",
    });
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida");
    const selection = decideContextReuse({ currentPrompt: workOrder.originalPrompt, currentWorkOrder: workOrder, memory: store.snapshot() });
    const uxContext = selectContextForAgent("ux_designer", workOrder, selection);
    const qualityContext = selectContextForAgent("quality_director", workOrder, selection);

    expect(uxContext.reusableAssets[0]?.kind).toBe("logo");
    expect(qualityContext.forbiddenPrimaryArtifactFingerprints).toContain("fp-logo");
    expect(JSON.stringify(uxContext)).not.toMatch(/hiddenDetails|toolTrace|checkpoints/i);
  });

  it("keeps separate primary artifacts across successive logo and website missions", () => {
    const logo = runAgentMission("logo EKIDA");
    const logoVisible = logo.visibleOutput as { primaryArtifactId?: string; primaryVisual?: string; kind?: string };
    const logoFingerprint = createArtifactFingerprint(logoVisible.primaryVisual ?? "");
    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: logoVisible.primaryVisual, primaryArtifactFingerprint: logoFingerprint },
    });
    const websiteVisible = website.visibleOutput as { primaryArtifactId?: string; primaryVisual?: string; kind?: string };

    expect(logoVisible.kind).toBe("visual");
    expect(websiteVisible.kind).toBe("website_preview");
    expect(websiteVisible.primaryArtifactId).not.toBe(logoVisible.primaryArtifactId);
    expect(createArtifactFingerprint(websiteVisible.primaryVisual ?? "")).not.toBe(logoFingerprint);
    expect(website.hiddenDetails.qualityReview).toMatchObject({ status: "approved" });
  });
});
