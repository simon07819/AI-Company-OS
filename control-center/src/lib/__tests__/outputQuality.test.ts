import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateBrandBrief, generateLogoConcepts } from "@/lib/brandGeneration";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";
import { evaluateBrandingQuality } from "@/lib/quality/brandingQualityRubric";
import { evaluateProductQuality } from "@/lib/quality/productQualityRubric";
import { containsPlaceholder } from "@/lib/quality/outputQuality";

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-quality-"));
  vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("generated output quality gates", () => {
  it("fails generic placeholder outputs", () => {
    expect(containsPlaceholder("Logo Concept — Nouvelle Marque AI")).toBe(true);

    const brief = generateBrandBrief("je veux un logo pour une compagnie");
    const report = evaluateBrandingQuality({ requestedBrandName: "ELEVIO", brief, concepts: generateLogoConcepts(brief) });

    expect(report.status).not.toBe("ready");
    expect(report.issues.join("\n")).toMatch(/Nom de marque|Nouvelle Marque AI|placeholder/i);
  });

  it("fails product output without artifacts", () => {
    const projectDir = path.join(root, "empty-project");
    fs.mkdirSync(projectDir, { recursive: true });

    const report = evaluateProductQuality({
      projectDir,
      spec: {
        slug: "empty-project",
        kind: "saas",
        name: "Empty SaaS",
        domain: "clinic",
        industry: "clinic",
        targetUser: "clinic operators",
        goal: "Manage appointments",
        constraints: [],
        coreFeatures: [],
        language: "en",
        prototypeNotice: "Prototype",
        createdAt: new Date().toISOString(),
      },
    });

    expect(report.status).toBe("incomplete");
    expect(report.issues.join("\n")).toMatch(/README|Starter Next|Spec produit/i);
  });

  it("passes SaaS quality when essential files and domain artifacts exist", () => {
    const result = buildProductArtifacts({
      requestText: "Je veux un SaaS pour gérer les rendez-vous d'une clinique",
      requestType: "saas",
    });

    expect(result.outputQuality.status).toBe("ready");
    expect(result.outputQuality.score).toBeGreaterThanOrEqual(85);
    expect(result.artifactPaths.some((artifact) => artifact.endsWith("output-quality-report.json"))).toBe(true);
  });

  it("fails a logo when the requested brand name is not respected", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle OTHER");
    const report = evaluateBrandingQuality({ requestedBrandName: "ELEVIO", brief, concepts: generateLogoConcepts(brief) });

    expect(report.status).not.toBe("ready");
    expect(report.issues.join("\n")).toMatch(/Nom de marque respecté/i);
  });

  it("passes ELEVIO logo checks enough to continue but still reports prototype quality", () => {
    const brief = generateBrandBrief("je veux un logo pour une compagnie qui s'appelle ELEVIO");
    const report = evaluateBrandingQuality({ requestedBrandName: "ELEVIO", brief, concepts: generateLogoConcepts(brief) });

    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.simpleLabel).toBe("Prêt");
    expect(report.issues).toEqual([]);
  });
});
