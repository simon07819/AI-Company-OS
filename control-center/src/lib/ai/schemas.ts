export const CEO_REQUEST_TYPES = ["saas", "website", "app", "branding", "logo", "automation", "business", "unknown"] as const;
export type CeoRequestType = typeof CEO_REQUEST_TYPES[number];

export interface CeoIntentResult {
  requestType: CeoRequestType;
  brandName: string | null;
  projectName: string | null;
  industry: string;
  targetUser: string;
  goal: string;
  constraints: string[];
  language: "fr" | "en" | "unknown";
  confidence: number;
  missingQuestions: string[];
  coreFeatures: string[];
  mode: "nvidia" | "prototype";
  prototypeNotice?: string;
}

export interface ExecutionArtifact {
  type: "brief" | "project_scaffold" | "page" | "component" | "api_spec" | "data_model" | "workflow" | "brand_concepts" | "validation_report";
  title: string;
  description: string;
  required: boolean;
}

export interface InternalExecutionStep {
  id: string;
  title: string;
  owner: string;
  artifactTypes: ExecutionArtifact["type"][];
}

export interface CeoExecutionPlan {
  visibleResponse: string;
  internalPlan: InternalExecutionStep[];
  expectedArtifacts: ExecutionArtifact[];
  agents: string[];
  simpleStatus: string;
  mode: "nvidia" | "prototype";
  prototypeNotice?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text ? text : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asConfidence(value: unknown): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0.5;
  return Math.max(0, Math.min(1, number));
}

export function isCeoRequestType(value: unknown): value is CeoRequestType {
  return typeof value === "string" && (CEO_REQUEST_TYPES as readonly string[]).includes(value);
}

export function validateCeoIntent(value: unknown, fallback: CeoIntentResult): CeoIntentResult {
  if (!isRecord(value)) return fallback;
  return {
    requestType: isCeoRequestType(value.requestType) ? value.requestType : fallback.requestType,
    brandName: asNullableString(value.brandName) ?? fallback.brandName,
    projectName: asNullableString(value.projectName) ?? fallback.projectName,
    industry: asString(value.industry, fallback.industry),
    targetUser: asString(value.targetUser, fallback.targetUser),
    goal: asString(value.goal, fallback.goal),
    constraints: asStringArray(value.constraints),
    language: value.language === "fr" || value.language === "en" ? value.language : fallback.language,
    confidence: asConfidence(value.confidence),
    missingQuestions: asStringArray(value.missingQuestions),
    coreFeatures: asStringArray(value.coreFeatures),
    mode: fallback.mode,
    prototypeNotice: fallback.prototypeNotice,
  };
}

export function validateExecutionPlan(value: unknown, fallback: CeoExecutionPlan): CeoExecutionPlan {
  if (!isRecord(value)) return fallback;
  return {
    visibleResponse: asString(value.visibleResponse, fallback.visibleResponse),
    internalPlan: fallback.internalPlan,
    expectedArtifacts: fallback.expectedArtifacts,
    agents: asStringArray(value.agents).length > 0 ? asStringArray(value.agents) : fallback.agents,
    simpleStatus: asString(value.simpleStatus, fallback.simpleStatus),
    mode: fallback.mode,
    prototypeNotice: fallback.prototypeNotice,
  };
}
