import { describe, expect, it } from "vitest";
import { validateWebsiteDeliverable } from "@/agents/quality/gates";
import { runCompanyWorkflow } from "@/agents/workflows/company-workflow";

describe("company workflow", () => {
  it("routes logo requests through the real design team", () => {
    const result = runCompanyWorkflow("logo EKIDA sur fond noir");
    const roles = result.agentRuns.map((run) => run.role);

    expect(result.workflow).toBe("logo");
    if (result.workflow !== "logo") throw new Error("Expected logo workflow");
    expect(result.workOrder.deliverableType).toBe("logo");
    expect(result.workOrder.brandName).toBe("EKIDA");
    expect(result.visibleOutput?.kind).toBe("visual");
    expect(result.visibleOutput?.deliverableType).toBe("logo");
    expect(result.visibleOutput?.primaryVisual).toContain("<svg");
    expect(result.visibleOutput?.primaryVisual).toMatch(/EKIDA|EK|>E</);
    expect(roles).toEqual(expect.arrayContaining([
      "ceo",
      "product_owner",
      "brand_strategist",
      "logo_designer",
      "creative_director",
      "svg_illustrator",
      "quality_director",
      "artifact_manager",
    ]));
    expect(result.hiddenDetails.toolTrace.map((trace) => trace.toolId)).toEqual(expect.arrayContaining([
      "visual.svg",
      "quality.evaluate",
      "artifact.store",
    ]));
    expect(JSON.stringify(result.visibleOutput)).not.toContain("toolTrace");
  });

  it("routes page web with logo as a website deliverable, not a recycled logo", () => {
    const previous = runCompanyWorkflow("logo EKIDA");
    const next = runCompanyWorkflow(
      "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge",
      {
        previousDeliverable: {
          deliverableType: "logo",
          primaryVisual: previous.visibleOutput?.primaryVisual ?? "",
        },
      },
    );
    const roles = next.agentRuns.map((run) => run.role);

    expect(next.workflow).toBe("website");
    if (next.workflow !== "website") throw new Error("Expected website workflow");
    expect(next.workOrder.requestType).toBe("website");
    expect(next.workOrder.deliverableType).not.toBe("logo");
    expect(next.workOrder.brandName).toBe("EKIDA");
    expect(next.workOrder.assetRequests).toContain("logo");
    expect(next.workOrder.contentMode).toBe("temporary");
    expect(next.workOrder.industry).toBe("apparel");
    expect(next.visibleOutput?.kind).toBe("website_preview");
    expect(next.visibleOutput?.primaryVisual).toContain("aria-label=\"nav\"");
    expect(next.visibleOutput?.primaryVisual).toContain("aria-label=\"hero\"");
    expect(next.visibleOutput?.primaryVisual).toContain("aria-label=\"sections\"");
    expect(next.visibleOutput?.primaryVisual).toContain("Voir la collection");
    expect(next.visibleOutput?.primaryVisual).not.toBe(previous.visibleOutput?.primaryVisual);
    expect(roles).toEqual(expect.arrayContaining([
      "ceo",
      "product_owner",
      "ux_designer",
      "web_designer",
      "frontend_builder",
      "quality_director",
      "artifact_manager",
    ]));
    const websiteQualityRun = next.agentRuns.find((run) => run.role === "quality_director" && run.skillId === "validate_website_deliverable");
    expect(websiteQualityRun?.output).toMatchObject({ ok: true });
    expect(next.hiddenDetails.toolTrace.map((trace) => trace.toolId)).toEqual(expect.arrayContaining([
      "website.preview",
      "quality.evaluate",
      "artifact.store",
    ]));
    expect(JSON.stringify(next.visibleOutput)).not.toContain("toolTrace");
  });

  it("blocks recycled or structureless website deliverables", () => {
    const previousVisual = "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>";

    expect(validateWebsiteDeliverable({
      brandName: "EKIDA",
      previousPrimaryVisual: previousVisual,
      visibleOutput: {
        kind: "website_preview",
        deliverableType: "website",
        brandName: "EKIDA",
        primaryVisual: previousVisual,
      },
    }).ok).toBe(false);

    expect(validateWebsiteDeliverable({
      brandName: "EKIDA",
      visibleOutput: {
        kind: "website_preview",
        deliverableType: "website",
        brandName: "EKIDA",
        primaryVisual: "<svg viewBox=\"0 0 10 10\"><text>EKIDA</text></svg>",
      },
    }).issues).toContain("structure page manquante");
  });
});
