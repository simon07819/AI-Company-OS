export type ProductionRequestType = "branding" | "saas" | "website" | "app" | "business-system" | "unknown";

export type ExpertRole =
  | "BrandStrategist"
  | "CreativeDirector"
  | "LogoDesigner"
  | "SaaSArchitect"
  | "WebsiteArchitect"
  | "UXDirector"
  | "BusinessStrategist"
  | "QualityDirector";

export type AgentTaskStatus = "pending" | "running" | "completed" | "failed";

export interface MissionPlan {
  id: string;
  requestType: ProductionRequestType;
  userGoal: string;
  brandName?: string | null;
  projectName?: string | null;
  industry: string;
  audience: string;
  requiredExperts: ExpertRole[];
  successCriteria: string[];
  artifactRequirements: string[];
  minimumQualityScore: number;
  sourcePrompt: string;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  missionId: string;
  expert: ExpertRole;
  title: string;
  status: AgentTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  artifactPaths: string[];
  summary: string;
  error?: string;
}

export interface AgentOutput {
  id: string;
  missionId: string;
  expert: ExpertRole;
  title: string;
  kind: "brief" | "concept" | "artifact" | "quality" | "plan";
  summary: string;
  content?: string;
  artifactPaths: string[];
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface QualityCheck {
  id: string;
  title: string;
  passed: boolean;
  reason: string;
  weight: number;
}

export interface QualityReport {
  id: string;
  missionId: string;
  score: number;
  passed: boolean;
  checks: QualityCheck[];
  rejectedReasons: string[];
  recommendations: string[];
  createdAt: string;
}

export interface RevisionAttempt {
  id: string;
  missionId: string;
  attemptNumber: number;
  reason: string;
  beforeScore: number;
  afterScore: number;
  changes: string[];
  outputIds: string[];
  createdAt: string;
}

export interface ArtifactManifestVersion {
  id: string;
  label: string;
  createdAt: string;
  summary: string;
  artifactPaths: string[];
}

export interface ArtifactManifest {
  projectId: string;
  title: string;
  requestType: ProductionRequestType;
  createdAt: string;
  updatedAt: string;
  artifactPaths: string[];
  status: "generated" | "ready" | "needs_review" | "failed" | "rejected";
  versions: ArtifactManifestVersion[];
  sourcePrompt: string;
  summary: string;
  qualityScore?: number;
  ledgerPath?: string;
  qualityReportPath?: string;
  revisionHistoryPath?: string;
  finalSelectionPath?: string;
  slug?: string;
  domain?: string;
  project?: string;
  generatedAt?: string;
  artifacts?: { path: string; fake: false }[];
  limitations?: string[];
  launch?: string[];
}

export interface FinalSelection {
  id: string;
  missionId: string;
  selectedOutputId: string;
  title: string;
  reason: string;
  qualityScore: number;
  artifactPaths: string[];
  readiness: "ready" | "needs_revision" | "rejected";
  createdAt: string;
}

export interface ProductionRun {
  id: string;
  plan: MissionPlan;
  tasks: AgentTask[];
  outputs: AgentOutput[];
  qualityReports: QualityReport[];
  revisions: RevisionAttempt[];
  finalSelection: FinalSelection | null;
  manifest: ArtifactManifest;
  status: "running" | "ready" | "needs_revision" | "rejected";
  projectSlug: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
}
