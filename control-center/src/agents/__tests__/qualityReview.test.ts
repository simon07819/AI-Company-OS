import { describe, expect, it } from "vitest";
import { createMissionArtifactStore } from "@/agents/artifacts/artifact-store";
import { buildLogoArtifact } from "@/agents/artifacts/logo-artifact-builder";
import { buildWebsiteArtifact } from "@/agents/artifacts/website-artifact-builder";
import { evaluateDeliverable } from "@/agents/quality/deliverable-evaluator";
import { approveFinalDeliverable } from "@/agents/quality/final-approval";
import { runRefinementLoop } from "@/agents/quality/refinement-loop";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import type { MissionArtifact } from "@/agents/artifacts/types";

function artifact(content: string, kind: MissionArtifact["kind"] = "logo_svg"): MissionArtifact {
  return {
    id: `${kind}-test`,
    missionId: "mission-test",
    turnId: "turn-test",
    kind,
    name: "test.svg",
    mimeType: "image/svg+xml",
    visibility: "simple_visible",
    content,
    fingerprint: "fingerprint-test",
    createdAt: new Date().toISOString(),
    metadata: {},
  };
}

describe("deliverable quality review logo", () => {
  it("rejects bad logo outputs", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA sur fond noir");
    const badCases = [
      { name: "text-only", svg: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>" },
      { name: "brand-system", svg: "<svg viewBox=\"0 0 100 100\"><text>Brand system</text><path d=\"M0 0h1\"/></svg>" },
      { name: "marque", svg: "<svg viewBox=\"0 0 100 100\"><text>Marque à nommer</text><path d=\"M0 0h1\"/></svg>" },
      { name: "wrong-letter", svg: "<svg viewBox=\"0 0 100 100\"><text>B</text><path d=\"M0 0h1\"/></svg>" },
      { name: "missing-black", svg: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text><path d=\"M0 0h1\"/></svg>" },
    ];

    for (const item of badCases) {
      const result = evaluateDeliverable({
        workOrder,
        visibleOutput: { kind: "visual", deliverableType: "logo", brandName: "EKIDA", primaryVisual: item.svg },
        primaryArtifact: artifact(item.svg),
        mode: "simple",
      });
      expect(result.status, item.name).not.toBe("approved");
    }
  });

  it("approves a valid EKIDA logo artifact", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA sur fond noir");
    const store = createMissionArtifactStore({ missionId: workOrder.missionId, turnId: workOrder.turnId });
    const built = buildLogoArtifact({
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      brandName: "EKIDA",
      background: "black",
      primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560"><rect width="900" height="560" fill="#030712"/><path d="M0 0h100v100H0z"/><text>EKIDA</text><text>EK</text></svg>`,
      store,
    });
    const review = evaluateDeliverable({
      workOrder,
      visibleOutput: { kind: "visual", deliverableType: "logo", brandName: "EKIDA", primaryVisual: built.artifact.content, primaryArtifactId: built.artifact.id },
      primaryArtifact: built.artifact,
      mode: "simple",
    });

    expect(review.status).toBe("approved");
    expect(() => approveFinalDeliverable({
      workOrder,
      visibleOutput: { kind: "visual", deliverableType: "logo", brandName: "EKIDA", primaryVisual: built.artifact.content, primaryArtifactId: built.artifact.id },
      primaryArtifact: built.artifact,
      qualityReview: review,
      mode: "simple",
    })).not.toThrow();
  });
});

describe("deliverable quality review website", () => {
  it("rejects website requests with logo-only or incomplete previews", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");
    const logoOnly = "<svg viewBox=\"0 0 100 100\" aria-label=\"Logo EKIDA\"><text>EKIDA</text><path d=\"M0 0h1\"/></svg>";
    const review = evaluateDeliverable({
      workOrder,
      visibleOutput: { kind: "website_preview", deliverableType: "landing_page", brandName: "EKIDA", primaryVisual: logoOnly },
      primaryArtifact: artifact(logoOnly, "website_preview_svg"),
      previousDeliverable: { deliverableType: "logo", primaryVisual: logoOnly },
      mode: "simple",
    });

    expect(review.status).toBe("rejected");
    expect(review.issues.map((issue) => issue.id)).toEqual(expect.arrayContaining(["website-logo-only", "website-nav", "website-hero", "website-cta", "website-sections"]));
  });

  it("approves structured EKIDA website previews", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");
    const built = buildWebsiteArtifact({
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      brandName: "EKIDA",
      industry: "apparel",
      contentMode: "temporary",
    });
    const review = evaluateDeliverable({
      workOrder,
      visibleOutput: { kind: "website_preview", deliverableType: "landing_page", brandName: "EKIDA", primaryVisual: built.artifact.content, primaryArtifactId: built.artifact.id },
      primaryArtifact: built.artifact,
      mode: "simple",
    });

    expect(review.status).toBe("approved");
  });
});

describe("refinement loop and runtime approval", () => {
  it("refines text-only logos until approved", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA sur fond noir");
    const badSvg = "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>";
    const result = runRefinementLoop({
      workOrder,
      visibleOutput: { kind: "visual", deliverableType: "logo", brandName: "EKIDA", primaryVisual: badSvg },
      primaryArtifact: artifact(badSvg),
      maxAttempts: 2,
    });

    expect(result.reviews[0].status).not.toBe("approved");
    expect(result.finalStatus).toBe("approved");
    expect(result.attempts.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.finalVisibleOutput)).not.toMatch(/reviews|attempts|score|process/i);
  });

  it("refines logo-only website outputs until approved", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");
    const oldLogo = "<svg viewBox=\"0 0 100 100\" aria-label=\"Logo EKIDA\"><text>EKIDA</text><path d=\"M0 0h1\"/></svg>";
    const result = runRefinementLoop({
      workOrder,
      visibleOutput: { kind: "website_preview", deliverableType: "landing_page", brandName: "EKIDA", primaryVisual: oldLogo },
      primaryArtifact: artifact(oldLogo, "website_preview_svg"),
      previousDeliverable: { deliverableType: "logo", primaryVisual: oldLogo },
      maxAttempts: 2,
    });

    expect(result.reviews[0].status).toBe("rejected");
    expect(result.finalStatus).toBe("approved");
    expect(JSON.stringify(result.finalVisibleOutput)).toMatch(/aria-label="nav"|aria-label="hero"|aria-label="sections"|Voir la collection/);
  });

  it("runtime returns only approved final deliverables with hidden reviews", () => {
    const logo = runAgentMission("logo EKIDA sur fond noir");
    const visibleLogo = logo.visibleOutput as { kind?: string; primaryArtifactId?: string; primaryVisual?: string };
    expect(visibleLogo.kind).toBe("visual");
    expect(visibleLogo.primaryArtifactId).toBeTruthy();
    expect(logo.hiddenDetails.qualityReview).toMatchObject({ status: "approved" });
    expect(JSON.stringify(visibleLogo)).not.toMatch(/qualityReview|attempts|score|process/i);

    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: visibleLogo.primaryVisual },
    });
    const visibleWebsite = website.visibleOutput as { kind?: string; primaryVisual?: string };
    expect(visibleWebsite.kind).toBe("website_preview");
    expect(website.hiddenDetails.qualityReview).toMatchObject({ status: "approved" });
    expect(visibleWebsite.primaryVisual).not.toBe(visibleLogo.primaryVisual);
  });
});
