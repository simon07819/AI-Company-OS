import { describe, expect, it } from "vitest";
import { generateBrandBrief, generateLogoConcepts, generateLogoImagePrompt } from "@/lib/brandGeneration";

describe("brandGeneration", () => {
  it("extracts explicit brand name and elevator-oriented industry", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle ELEVIO");

    expect(brief.requestType).toBe("logo");
    expect(brief.brandName).toBe("ELEVIO");
    expect(brief.explicitBrandName).toBe(true);
    expect(brief.industry).toMatch(/élévateurs|elevateurs|construction verticale/i);
    expect(brief.brandName).not.toBe("Nouvelle Marque AI");
  });

  it("generates three professional logo directions and future image prompts", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle ELEVIO");
    const concepts = generateLogoConcepts(brief);

    expect(concepts).toHaveLength(3);
    expect(concepts.map((concept) => concept.title)).toEqual([
      "Premium construction tech",
      "Fast vertical movement / elevator signal",
      "Safety + reliability",
    ]);
    expect(concepts.every((concept) => concept.brandName === "ELEVIO")).toBe(true);
    expect(generateLogoImagePrompt(concepts[0])).toContain("ELEVIO");
  });
});
