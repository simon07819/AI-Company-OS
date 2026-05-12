import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProductArtifacts } from "@/lib/product-builder/artifactWriter";
import { assertNoCompletedStepWithoutArtifacts, completeLedgerStep, createLedger } from "@/lib/product-builder/executionLedger";
import { validateGeneratedProduct } from "@/lib/product-builder/qualityGate";

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-product-builder-"));
  vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("AI Product Builder", () => {
  it("creates a concrete SaaS artifact folder", () => {
    const result = buildProductArtifacts({
      requestText: "je veux un SaaS pour gérer des gyms",
      requestType: "saas",
      projectName: "Gym management SaaS",
      industry: "fitness",
      targetUser: "gestionnaires de gyms, coachs et membres",
      goal: "Créer un SaaS pour gérer des gyms",
      coreFeatures: ["membres", "abonnements", "horaires", "coachs", "paiements", "dashboard"],
      language: "fr",
    });

    const projectDir = path.join(root, result.spec.slug);
    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "product-spec.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "next-app", "package.json"))).toBe(true);
  });

  it("records artifact paths for every completed ledger step", () => {
    const result = buildProductArtifacts({
      requestText: "je veux un SaaS pour gérer des gyms",
      requestType: "saas",
    });

    expect(result.ledger.steps.length).toBeGreaterThan(0);
    expect(result.ledger.steps.every((step) => step.status !== "completed" || step.artifactPaths.length > 0)).toBe(true);
    expect(() => assertNoCompletedStepWithoutArtifacts(result.ledger)).not.toThrow();
  });

  it("refuses to mark a step completed without an artifact", () => {
    const ledger = createLedger("bad-project", ["No artifact step"]);
    expect(() => completeLedgerStep(ledger, "step-1", [], "Nothing created")).toThrow(/artifactPaths/);
  });

  it("fails the quality gate when required files are absent", () => {
    const projectDir = path.join(root, "missing-files");
    fs.mkdirSync(projectDir, { recursive: true });

    const gate = validateGeneratedProduct(projectDir);

    expect(gate.ok).toBe(false);
    expect(gate.missingFiles).toEqual(expect.arrayContaining(["README.md", "product-spec.json", "app-map.md"]));
  });

  it("passes the quality gate when required files are present", () => {
    const result = buildProductArtifacts({
      requestText: "je veux un site web pour un restaurant",
      requestType: "website",
      projectName: "Restaurant website",
      industry: "restaurant",
    });

    const gate = validateGeneratedProduct(path.join(root, result.spec.slug));

    expect(gate.ok).toBe(true);
    expect(gate.missingFiles).toEqual([]);
  });
});
