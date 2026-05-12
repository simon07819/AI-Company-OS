import fs from "fs";
import path from "path";
import { createAppBlueprint } from "./appBlueprint";
import { completeLedgerStep, createLedger, startLedgerStep, writeExecutionLedger } from "./executionLedger";
import { createProductSpec } from "./productSpec";
import { createSaasBlueprint } from "./saasBlueprint";
import { validateGeneratedProduct } from "./qualityGate";
import { createWebsiteBlueprint } from "./websiteBlueprint";
import type { ProductArtifactManifest, ProductBuildResult, ProductBuilderInput, ProductFile, ProductKind, ProductSpec, WrittenArtifact } from "./types";
import { evaluateProductQuality } from "@/lib/quality/productQualityRubric";
import { writeValidationReport } from "@/lib/quality/validationReport";

export function generatedProductsRoot(): string {
  return path.resolve(process.env.AI_COMPANY_PRODUCTS_DIR ?? path.join(process.cwd(), "generated-products"));
}

function blueprintFor(kind: ProductKind, spec: ProductSpec): ProductFile[] {
  if (kind === "website") return createWebsiteBlueprint(spec);
  if (kind === "app") return createAppBlueprint(spec);
  return createSaasBlueprint(spec);
}

function assertInsideRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Product artifact path escaped generated-products root");
  }
}

function writeFiles(projectDir: string, files: ProductFile[]): WrittenArtifact[] {
  return files.map((file) => {
    const target = path.join(projectDir, file.relativePath);
    assertInsideRoot(generatedProductsRoot(), target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf-8");
    return {
      relativePath: path.relative(process.cwd(), target),
      absolutePath: target,
    };
  });
}

function writeArtifactManifest(projectDir: string, spec: ProductSpec, artifactPaths: string[], sourcePrompt: string): string {
  const manifestPath = path.join(projectDir, "artifact-manifest.json");
  const manifestRelativePath = path.relative(process.cwd(), manifestPath);
  const generatedAt = new Date().toISOString();
  const qualityReportPath = path.relative(process.cwd(), path.join(projectDir, "quality-report.json"));
  const ledgerPath = path.relative(process.cwd(), path.join(projectDir, "execution-ledger.json"));
  const allArtifacts = Array.from(new Set([...artifactPaths, manifestRelativePath, qualityReportPath, ledgerPath]));
  const limitations = [
    "Prototype local seulement.",
    "Données mockées.",
    "Aucun déploiement automatique.",
    "Authentification, base de données et intégrations externes restent à brancher.",
  ];
  const launch = ["cd next-app", "npm install", "npm run dev"];
  const summary = `${spec.name} contient un brief produit, des artifacts de cadrage et un prototype Next.js local traçable.`;
  const manifest: ProductArtifactManifest = {
    projectId: spec.slug,
    title: spec.name,
    requestType: spec.kind,
    createdAt: spec.createdAt,
    updatedAt: generatedAt,
    artifactPaths: allArtifacts,
    status: "generated",
    versions: [{
      id: "v1",
      label: "Version 1",
      createdAt: generatedAt,
      summary,
      artifactPaths: allArtifacts,
    }],
    sourcePrompt,
    summary,
    project: spec.name,
    slug: spec.slug,
    kind: spec.kind,
    domain: spec.domain,
    generatedAt,
    artifacts: allArtifacts.map((artifactPath) => ({ path: artifactPath, fake: false })),
    limitations,
    launch,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  return manifestRelativePath;
}

export function buildProductArtifacts(input: ProductBuilderInput): ProductBuildResult {
  const spec = createProductSpec(input);
  const root = generatedProductsRoot();
  const projectDir = path.join(root, spec.slug);
  assertInsideRoot(root, projectDir);
  fs.mkdirSync(projectDir, { recursive: true });

  let ledger = createLedger(spec.slug, [
    "Create product specification",
    "Write product planning artifacts",
    "Create runnable Next prototype",
    "Run local artifact quality gate",
  ]);

  ledger = startLedgerStep(ledger, "step-1");
  const files = blueprintFor(spec.kind, spec);
  const written = writeFiles(projectDir, files);
  const specArtifact = written.find((artifact) => artifact.relativePath.endsWith("product-spec.json"));
  ledger = completeLedgerStep(ledger, "step-1", specArtifact ? [specArtifact.relativePath] : ["product-spec.json"], "Product specification created.");

  const planningArtifacts = written
    .filter((artifact) => !artifact.relativePath.includes("next-app/") && !artifact.relativePath.endsWith("product-spec.json"))
    .map((artifact) => artifact.relativePath);
  ledger = startLedgerStep(ledger, "step-2");
  ledger = completeLedgerStep(ledger, "step-2", planningArtifacts, "Planning artifacts written.");

  const prototypeArtifacts = written
    .filter((artifact) => artifact.relativePath.includes("next-app/"))
    .map((artifact) => artifact.relativePath);
  ledger = startLedgerStep(ledger, "step-3");
  ledger = completeLedgerStep(ledger, "step-3", prototypeArtifacts, "Runnable prototype scaffold written.");

  const manifestPath = writeArtifactManifest(projectDir, spec, written.map((artifact) => artifact.relativePath), input.requestText);

  const qualityGate = validateGeneratedProduct(projectDir);
  const qualityReportPath = path.join(projectDir, "quality-report.json");
  assertInsideRoot(root, qualityReportPath);
  fs.writeFileSync(qualityReportPath, JSON.stringify(qualityGate, null, 2) + "\n", "utf-8");
  ledger = startLedgerStep(ledger, "step-4");
  ledger = completeLedgerStep(ledger, "step-4", [path.relative(process.cwd(), qualityReportPath)], qualityGate.summary);
  const ledgerPath = writeExecutionLedger(projectDir, ledger);
  const outputQuality = evaluateProductQuality({ projectDir, spec });
  const outputQualityPath = writeValidationReport(projectDir, outputQuality);

  return {
    spec,
    projectPath: path.relative(process.cwd(), projectDir),
    artifactPaths: [...written.map((artifact) => artifact.relativePath), manifestPath, path.relative(process.cwd(), outputQualityPath), path.relative(process.cwd(), qualityReportPath), path.relative(process.cwd(), ledgerPath)],
    ledger,
    qualityGate,
    outputQuality,
    launchInstructions: ["cd next-app", "npm install", "npm run dev"],
  };
}
