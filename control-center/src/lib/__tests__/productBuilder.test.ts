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

  it("generates domain-aware gym SaaS routes and mock data", () => {
    const result = buildProductArtifacts({
      requestText: "je veux un SaaS pour gérer des gyms",
      requestType: "saas",
    });
    const projectDir = path.join(root, result.spec.slug);
    const mockData = fs.readFileSync(path.join(projectDir, "next-app", "lib", "mockData.ts"), "utf-8");

    expect(fs.existsSync(path.join(projectDir, "next-app", "app", "members", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "next-app", "app", "classes", "page.tsx"))).toBe(true);
    expect(mockData).toContain("Active members");
    expect(mockData).toContain("HIIT");
  });

  it("generates domain-aware clinic SaaS routes and mock data", () => {
    const result = buildProductArtifacts({
      requestText: "Je veux un SaaS pour gérer les rendez-vous d'une clinique",
      requestType: "saas",
    });
    const projectDir = path.join(root, result.spec.slug);
    const spec = JSON.parse(fs.readFileSync(path.join(projectDir, "product-spec.json"), "utf-8")) as { domain: string; features: string[]; routes: string[] };
    const mockData = fs.readFileSync(path.join(projectDir, "next-app", "lib", "mockData.ts"), "utf-8");

    expect(spec.domain).toBe("clinic");
    expect(spec.features).toEqual(expect.arrayContaining(["patients", "rendez-vous", "praticiens", "facturation"]));
    expect(spec.routes).toEqual(expect.arrayContaining(["/patients", "/appointments", "/practitioners", "/billing"]));
    expect(fs.existsSync(path.join(projectDir, "next-app", "app", "patients", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "next-app", "app", "appointments", "page.tsx"))).toBe(true);
    expect(mockData).toContain("Appointments today");
    expect(mockData).toContain("Dental hygiene");
  });

  it("writes launch commands and a complete non-fake artifact manifest", () => {
    const result = buildProductArtifacts({
      requestText: "Je veux un SaaS pour gérer les rendez-vous d'une clinique",
      requestType: "saas",
    });
    const projectDir = path.join(root, result.spec.slug);
    const readme = fs.readFileSync(path.join(projectDir, "README.md"), "utf-8");
    const manifest = JSON.parse(fs.readFileSync(path.join(projectDir, "artifact-manifest.json"), "utf-8")) as { artifacts: { path: string; fake: boolean }[]; launch: string[] };

    expect(readme).toContain("cd next-app");
    expect(readme).toContain("npm install");
    expect(readme).toContain("npm run dev");
    expect(manifest.launch).toEqual(["cd next-app", "npm install", "npm run dev"]);
    expect(manifest.artifacts.map((artifact) => artifact.path).join("\n")).toContain("next-app/app/dashboard/page.tsx");
    expect(manifest.artifacts.map((artifact) => artifact.path).join("\n")).toContain("artifact-manifest.json");
    expect(manifest.artifacts.every((artifact) => artifact.fake === false)).toBe(true);
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

  it("generates domain-aware construction website content", () => {
    const result = buildProductArtifacts({
      requestText: "Je veux un site web premium pour une entreprise de construction",
      requestType: "website",
    });
    const projectDir = path.join(root, result.spec.slug);
    const spec = JSON.parse(fs.readFileSync(path.join(projectDir, "product-spec.json"), "utf-8")) as { domain: string; industry: string; coreFeatures: string[] };
    const designDirection = fs.readFileSync(path.join(projectDir, "design-direction.md"), "utf-8");
    const contentPlan = fs.readFileSync(path.join(projectDir, "content-plan.md"), "utf-8");
    const page = fs.readFileSync(path.join(projectDir, "next-app", "app", "page.tsx"), "utf-8");

    expect(spec.domain).toBe("construction");
    expect(spec.industry).toBe("construction");
    expect(spec.coreFeatures).toEqual(expect.arrayContaining(["projets réalisés", "services construction", "soumission"]));
    expect(designDirection).toMatch(/construction|steel blue|project photography/i);
    expect(contentPlan).toMatch(/construction quote|site consultation|completed builds/i);
    expect(page).toContain("Build with confidence");
    expect(page).toContain("Request a quote");
  });
});
