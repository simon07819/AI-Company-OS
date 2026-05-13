export type CEORequestType = "branding" | "logo" | "website" | "saas" | "app" | "business-system" | "unknown";

export type CEOMissionStatus =
  | "idle"
  | "preparing"
  | "production"
  | "validation"
  | "ready"
  | "needs_revision"
  | "rejected"
  | "error"
  | "queued"
  | "planning"
  | "running"
  | "reviewing"
  | "needs_action"
  | "completed"
  | "failed";

export type AttachmentKind = "image" | "video" | "file";

export type AttachmentUploadState = "ready" | "rejected";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  extension: string;
  previewUrl?: string;
  uploadState: AttachmentUploadState;
}

export interface ChatAttachmentPayload {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  extension: string;
}

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
  hideUserPrompt?: boolean;
  attachments?: ChatAttachment[];
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
  artifactId?: string | null;
  primaryArtifactId?: string | null;
  primaryArtifactFingerprint?: string | null;
  sourceType?: "real-image-provider" | "nvidia" | "nvidia_text" | "provider_unavailable" | "code_artifact" | "local_storage" | "local_svg" | "local" | "mock" | "fallback" | "none" | string;
  providerUsed?: string | null;
  allowLocalPrototype?: boolean;
  prototypeVariants?: Array<{
    id?: string;
    title: string;
    svg: string;
  }>;
  status: CEOMissionStatus;
  summary: string;
  artifactPaths: string[];
  workspaceHref?: string;
  qualityScore?: number;
  qualityStatus?: string;
  limitations?: string[];
  launchInstructions?: string[];
  deliverables?: Array<{
    id?: string;
    artifactId?: string;
    type?: string;
    title: string;
    sourceType?: string;
    providerUsed?: string;
    createdAt?: string;
  }>;
  expert?: {
    plan?: unknown;
    qualityReport?: unknown;
    revisions?: unknown;
    manifest?: unknown;
    runtime?: unknown;
    diagnostic?: unknown;
    companyWorkflow?: unknown;
    prototype?: unknown;
  };
}

export type CEOMissionAction =
  | "prepare_brief"
  | "create_visual_prompts"
  | "request_local_prototype"
  | "modify_current_deliverable";
