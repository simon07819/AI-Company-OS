import { describe, expect, it } from "vitest";
import { generateBrandBrief, generateLogoConcepts, generateLogoImagePrompt } from "@/lib/brandGeneration";

describe("brandGeneration", () => {
  it("extracts bare logo brand names without using unnamed fallbacks", () => {
    expect(generateBrandBrief("logo EKIDA")).toMatchObject({
      requestType: "logo",
      brandName: "EKIDA",
      explicitBrandName: true,
    });
    expect(generateBrandBrief("je veux un logo pour EKIDA")).toMatchObject({
      requestType: "logo",
      brandName: "EKIDA",
      explicitBrandName: true,
    });
    expect(generateBrandBrief("logo sportif ELEVIO")).toMatchObject({
      requestType: "logo",
      brandName: "ELEVIO",
      explicitBrandName: true,
    });
    expect(JSON.stringify(generateBrandBrief("logo EKIDA"))).not.toContain("Marque à nommer");
  });

  it("extracts explicit brand name and elevator-oriented industry", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle ELEVIO");

    expect(brief.requestType).toBe("logo");
    expect(brief.brandName).toBe("ELEVIO");
    expect(brief.explicitBrandName).toBe(true);
    expect(brief.industry).toMatch(/élévateurs|elevateurs|construction verticale/i);
    expect(brief.industryConfidence).toBe("weak");
    expect(brief.industryAssumption).toMatch(/Hypothèse faible|elevation/i);
    expect(brief.brandName).not.toBe("Nouvelle Marque AI");
  });

  it("generates three professional logo directions and future image prompts", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle ELEVIO");
    const concepts = generateLogoConcepts(brief);

    expect(concepts).toHaveLength(3);
    expect(concepts.map((concept) => concept.title)).toEqual([
      "Premium / corporate",
      "Mouvement / vitesse / verticalité",
      "Sécurité / fiabilité / infrastructure",
    ]);
    expect(concepts.every((concept) => concept.brandName === "ELEVIO")).toBe(true);
    expect(concepts.every((concept) => concept.palette.length >= 4)).toBe(true);
    expect(concepts.every((concept) => concept.palette.every((color) => color.justification.length > 12))).toBe(true);
    expect(concepts.every((concept) => concept.typography.length > 20)).toBe(true);
    expect(concepts.every((concept) => concept.rationale.length > 20)).toBe(true);
    expect(concepts.every((concept) => concept.prototypeNotice === "Prototype visuel — prêt pour génération finale")).toBe(true);
    expect(concepts.every((concept) => concept.imagePrompt.includes("ELEVIO"))).toBe(true);
    expect(generateLogoImagePrompt(concepts[0])).toContain("ELEVIO");
  });

  it("does not fall back to Nouvelle Marque AI when no name is provided", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie de photo");

    expect(brief.brandName).toBe("Marque à nommer");
    expect(JSON.stringify(brief)).not.toContain("Nouvelle Marque AI");
  });
});
