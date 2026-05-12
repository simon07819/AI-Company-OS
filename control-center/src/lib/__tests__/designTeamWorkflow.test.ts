import { describe, expect, it } from "vitest";
import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";

describe("design team logo workflow", () => {
  it("runs a real creative team workflow for an EKIDA logo", () => {
    const result = runDesignTeamWorkflow("logo EKIDA sur fond noir");

    expect(result.brief).toMatchObject({
      deliverableType: "logo",
      brandName: "EKIDA",
      background: "black",
    });
    expect(result.concepts).toHaveLength(3);
    expect(result.concepts.every((concept) => concept.svg.includes("<svg"))).toBe(true);
    expect(result.selectedConcept).toBeTruthy();
    expect(result.primaryVisual).toContain("<svg");
    expect(result.primaryVisual).toContain("EKIDA");
    expect(result.primaryVisual).toMatch(/EK|E/);
    expect(result.primaryVisual).not.toMatch(/>A<|>B</);
    expect(result.artDirectorNotes.join(" ")).toMatch(/Sélection|symbole|fond noir/i);
    expect(result.hiddenDetails.agentRuns.map((run) => run.role)).toEqual(
      expect.arrayContaining([
        "ceo",
        "product_owner",
        "brand_strategist",
        "logo_designer",
        "creative_director",
        "svg_illustrator",
        "quality_director",
        "artifact_manager",
      ]),
    );
    expect(result.hiddenDetails.qualityIssues).toEqual([]);
    expect(result.visibleOutput).toMatchObject({
      kind: "visual",
      deliverableType: "logo",
      brandName: "EKIDA",
      mediaType: "svg",
    });
  });

  it("extracts sportif style without polluting the brand name", () => {
    const result = runDesignTeamWorkflow("fais-moi un logo sportif ELEVIO");

    expect(result.brief.brandName).toBe("ELEVIO");
    expect(result.brief.style).toBe("sportif");
    expect(result.brief.brandName).not.toContain("sportif");
    expect(JSON.stringify(result.hiddenDetails)).not.toContain("Marque à nommer");
  });

  it("extracts PROSHOTS without absorbing the audience context", () => {
    const result = runDesignTeamWorkflow("fais-moi un logo pour PROSHOTS ses des photographes sportifs");

    expect(result.brief.brandName).toBe("PROSHOTS");
    expect(result.brief.style).toBe("sportif");
    expect(result.brief.brandName).not.toMatch(/photographes|sportifs|ses/i);
    expect(result.primaryVisual).toContain("PROSHOTS");
    expect(result.primaryVisual).toMatch(/camera|viewfinder|viseur|PROSHOTS|PS|>P</i);
    expect(result.hiddenDetails.qualityIssues).toEqual([]);
  });

  it("keeps the visible output focused on the deliverable only", () => {
    const result = runDesignTeamWorkflow("logo EKIDA");

    expect(result.visibleOutput).toEqual({
      kind: "visual",
      deliverableType: "logo",
      brandName: "EKIDA",
      mediaType: "svg",
      primaryVisual: result.primaryVisual,
    });
    expect(JSON.stringify(result.visibleOutput)).not.toMatch(/score|artifact|workspace|README|quality|process|Brand system|Marque à nommer/i);
  });
});
