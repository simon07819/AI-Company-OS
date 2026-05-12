export type ArtifactKind =
  | "logo_svg"
  | "logo_variant"
  | "website_html"
  | "website_preview_svg"
  | "website_preview_component"
  | "screenshot"
  | "brief"
  | "concept"
  | "quality_report"
  | "internal_trace";

export type ArtifactVisibility = "simple_visible" | "details_only" | "internal_only";

export type MissionArtifact = {
  id: string;
  missionId: string;
  turnId: string;
  kind: ArtifactKind;
  name: string;
  mimeType: string;
  visibility: ArtifactVisibility;
  content?: string;
  path?: string;
  fingerprint: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type ArtifactStoreInput = {
  missionId: string;
  turnId: string;
  kind: ArtifactKind;
  name: string;
  mimeType: string;
  visibility: ArtifactVisibility;
  content: string;
  metadata?: Record<string, unknown>;
};

export type VisibleDeliverableArtifact = {
  artifactId: string;
  kind: "logo" | "website_preview";
  mediaType: "svg" | "html" | "image";
  brandName?: string;
  content: string;
  alt: string;
};

export type ArtifactBuildResult = {
  artifact: MissionArtifact;
  visibleDeliverable: VisibleDeliverableArtifact;
};
