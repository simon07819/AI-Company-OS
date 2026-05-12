export type CEORequestType = "branding" | "logo" | "website" | "saas" | "app" | "business-system" | "unknown";

export type CEOMissionStatus = "idle" | "preparing" | "production" | "validation" | "ready" | "needs_revision" | "rejected" | "error";

export interface CEOActionResult {
  label: string;
  targetId?: string;
  href?: string;
  kind?: string;
  artifactPaths: string[];
  summary?: string;
  limitations?: string[];
  launchInstructions?: string[];
  qualityStatus?: string;
  qualityScore?: number;
}

export interface CEOCurrentMission {
  id: string;
  prompt: string;
  requestType: CEORequestType;
  status: CEOMissionStatus;
  createdAt: string;
  artifactCount: number;
  workspaceHref?: string;
  qualityScore?: number;
}

export interface CEOCurrentResult {
  title: string;
  requestType: CEORequestType;
  brandName?: string | null;
  deliverableType?: string;
  shortMessage?: string;
  primaryVisualPath?: string | null;
  primaryVisual?: string | null;
  status: CEOMissionStatus;
  summary: string;
  artifactPaths: string[];
  workspaceHref?: string;
  qualityScore?: number;
  qualityStatus?: string;
  limitations?: string[];
  launchInstructions?: string[];
  expert?: {
    plan?: unknown;
    qualityReport?: unknown;
    revisions?: unknown;
    manifest?: unknown;
    runtime?: unknown;
    companyWorkflow?: unknown;
  };
}
