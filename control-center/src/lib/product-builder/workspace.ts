import fs from "fs";
import path from "path";
import { generatedProductsRoot } from "./artifactWriter";
import type { ExecutionLedger, ProductArtifactManifest, ProductArtifactManifestVersion, ProductKind, ProductSpec, QualityGateResult } from "./types";
import type { OutputQualityReport } from "@/lib/quality/outputQuality";

type LooseManifest = Partial<ProductArtifactManifest> & {
  artifacts?: { path: string; fake?: boolean }[];
  kind?: ProductKind;
  project?: string;
  generatedAt?: string;
};

export interface GeneratedProjectSummary {
  id: string;
  slug: string;
  title: string;
  requestType: ProductKind;
  status: string;
  updatedAt: string;
  summary: string;
  artifactCount: number;
}

export interface GeneratedProjectWorkspace extends GeneratedProjectSummary {
  projectId: string;
  createdAt: string;
  domain: string;
  sourcePrompt: string;
  artifactPaths: string[];
  primaryArtifactPaths: string[];
  versions: ProductArtifactManifestVersion[];
  launch: string[];
  limitations: string[];
  projectPath: string;
  productSpec: ProductSpec | null;
  ledger: ExecutionLedger | null;
  qualityGate: QualityGateResult | null;
  outputQuality: OutputQualityReport | null;
  preview: {
    title: string;
    body: string;
    routes: string[];
    features: string[];
  };
  rawManifest: LooseManifest;
}

const TECHNICAL_ARTIFACTS = new Set([
  "artifact-manifest.json",
  "execution-ledger.json",
  "quality-report.json",
  "output-quality-report.json",
]);

function safeJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function isInsideRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function readTextExcerpt(filePath: string, max = 900) {
  if (!fs.existsSync(filePath)) return "";
  try {
    return fs.readFileSync(filePath, "utf-8").replace(/\s+/g, " ").trim().slice(0, max);
  } catch {
    return "";
  }
}

function normalizeArtifactPath(projectDir: string, artifactPath: string) {
  if (artifactPath.startsWith("generated-products/")) return artifactPath;
  return path.relative(process.cwd(), path.join(projectDir, artifactPath));
}

function primaryArtifacts(artifactPaths: string[]) {
  return artifactPaths.filter((artifactPath) => !TECHNICAL_ARTIFACTS.has(path.basename(artifactPath)));
}

function statusFromQuality(manifest: LooseManifest, qualityGate: QualityGateResult | null) {
  if (manifest.status) return manifest.status;
  if (!qualityGate) return "generated";
  return qualityGate.ok ? "ready" : "needs_review";
}

function fallbackVersions(createdAt: string, summary: string, artifactPaths: string[]): ProductArtifactManifestVersion[] {
  return [{
    id: "v1",
    label: "Version 1",
    createdAt,
    summary,
    artifactPaths,
  }];
}

export function readGeneratedProject(slug: string): GeneratedProjectWorkspace | null {
  const root = generatedProductsRoot();
  const projectDir = path.join(root, slug);
  if (!isInsideRoot(root, projectDir)) return null;
  const manifestPath = path.join(projectDir, "artifact-manifest.json");
  const manifest = safeJson<LooseManifest>(manifestPath);
  if (!manifest) return null;

  const productSpec = safeJson<ProductSpec>(path.join(projectDir, "product-spec.json"));
  const ledger = safeJson<ExecutionLedger>(path.join(projectDir, "execution-ledger.json"));
  const qualityGate = safeJson<QualityGateResult>(path.join(projectDir, "quality-report.json"));
  const outputQuality = safeJson<OutputQualityReport>(path.join(projectDir, "output-quality-report.json"));
  const artifactPaths = (manifest.artifactPaths?.length ? manifest.artifactPaths : manifest.artifacts?.map((artifact) => artifact.path) ?? [])
    .map((artifactPath) => normalizeArtifactPath(projectDir, artifactPath));
  const title = manifest.title ?? manifest.project ?? productSpec?.name ?? slug;
  const requestType = manifest.requestType ?? manifest.kind ?? productSpec?.kind ?? "saas";
  const createdAt = manifest.createdAt ?? manifest.generatedAt ?? productSpec?.createdAt ?? new Date(0).toISOString();
  const updatedAt = manifest.updatedAt ?? manifest.generatedAt ?? createdAt;
  const summary = manifest.summary ?? productSpec?.prototypeNotice ?? qualityGate?.summary ?? "Projet généré avec artifacts locaux.";
  const readmePath = path.join(projectDir, "README.md");

  return {
    id: manifest.projectId ?? manifest.slug ?? slug,
    projectId: manifest.projectId ?? manifest.slug ?? slug,
    slug: manifest.slug ?? slug,
    title,
    requestType,
    status: statusFromQuality(manifest, qualityGate),
    createdAt,
    updatedAt,
    summary,
    artifactCount: artifactPaths.length,
    domain: manifest.domain ?? productSpec?.domain ?? "general business",
    sourcePrompt: manifest.sourcePrompt ?? productSpec?.goal ?? "",
    artifactPaths,
    primaryArtifactPaths: primaryArtifacts(artifactPaths),
    versions: manifest.versions?.length ? manifest.versions : fallbackVersions(createdAt, summary, artifactPaths),
    launch: manifest.launch ?? ["cd next-app", "npm install", "npm run dev"],
    limitations: manifest.limitations ?? qualityGate?.limits ?? [],
    projectPath: path.relative(process.cwd(), projectDir),
    productSpec,
    ledger,
    qualityGate,
    outputQuality,
    preview: {
      title,
      body: readTextExcerpt(readmePath) || summary,
      routes: [],
      features: productSpec?.coreFeatures ?? [],
    },
    rawManifest: manifest,
  };
}

export function listGeneratedProjects(): GeneratedProjectSummary[] {
  const root = generatedProductsRoot();
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readGeneratedProject(entry.name))
    .filter((project): project is GeneratedProjectWorkspace => Boolean(project))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      requestType: project.requestType,
      status: project.status,
      updatedAt: project.updatedAt,
      summary: project.summary,
      artifactCount: project.artifactCount,
    }));
}
