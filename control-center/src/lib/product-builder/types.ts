export type ProductKind = "saas" | "website" | "app";

export type LedgerStepStatus = "pending" | "running" | "completed" | "failed";

export interface ProductBuilderInput {
  requestText: string;
  requestType: ProductKind;
  projectName?: string | null;
  brandName?: string | null;
  industry?: string | null;
  targetUser?: string | null;
  goal?: string | null;
  constraints?: string[];
  coreFeatures?: string[];
  language?: "fr" | "en" | "unknown";
}

export interface ProductSpec {
  slug: string;
  kind: ProductKind;
  name: string;
  domain: string;
  industry: string;
  targetUser: string;
  goal: string;
  constraints: string[];
  coreFeatures: string[];
  language: "fr" | "en" | "unknown";
  prototypeNotice: string;
  createdAt: string;
}

export interface ProductFile {
  relativePath: string;
  content: string;
}

export interface WrittenArtifact {
  relativePath: string;
  absolutePath: string;
}

export interface ExecutionLedgerEntry {
  id: string;
  title: string;
  status: LedgerStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  artifactPaths: string[];
  summary: string;
  error?: string;
}

export interface ExecutionLedger {
  projectSlug: string;
  createdAt: string;
  updatedAt: string;
  steps: ExecutionLedgerEntry[];
}

export interface QualityGateCheck {
  id: string;
  title: string;
  ok: boolean;
  detail: string;
}

export interface QualityGateResult {
  ok: boolean;
  checks: QualityGateCheck[];
  missingFiles: string[];
  summary: string;
  limits: string[];
}

export interface ProductBuildResult {
  spec: ProductSpec;
  projectPath: string;
  artifactPaths: string[];
  ledger: ExecutionLedger;
  qualityGate: QualityGateResult;
  launchInstructions: string[];
}
