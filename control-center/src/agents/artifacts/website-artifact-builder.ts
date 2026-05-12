import { renderWebsitePreviewSvg } from "@/agents/capabilities/adapters/website-preview-adapter";
import type { WebsiteTeamResult } from "@/agents/workflows/website-design-workflow";
import { artifactIsLogoOnly, renderVisibleDeliverableFromArtifact } from "./artifact-renderer";
import { createMissionArtifactStore, type MissionArtifactStore } from "./artifact-store";
import { sanitizeSvgArtifact } from "./artifact-sanitizer";
import type { ArtifactBuildResult } from "./types";

function validateWebsiteSvg(input: { brandName: string; svg: string; previousPrimaryVisual?: string | null }) {
  if (!input.brandName || /Marque à nommer/i.test(input.brandName)) throw new Error("Website artifact missing real brandName");
  if (/Brand system|Marque à nommer/i.test(input.svg)) throw new Error("Generic website placeholder blocked");
  if (artifactIsLogoOnly(input.svg)) throw new Error("Website artifact is logo-only");
  if (!/aria-label="nav"/i.test(input.svg)) throw new Error("Website preview missing nav");
  if (!/aria-label="hero"/i.test(input.svg)) throw new Error("Website preview missing hero");
  if (!/aria-label="sections"/i.test(input.svg)) throw new Error("Website preview missing sections");
  if (!/Voir la collection|CTA|Acheter|Contact/i.test(input.svg)) throw new Error("Website preview missing CTA");
  if (input.previousPrimaryVisual && input.svg === input.previousPrimaryVisual) {
    throw new Error("Website artifact reused previous primaryVisual");
  }
}

export function buildWebsiteArtifact(input: {
  missionId: string;
  turnId: string;
  brandName: string;
  industry?: string;
  style?: string;
  contentMode?: "temporary" | "real";
  assetRequests?: string[];
  workflow?: WebsiteTeamResult | null;
  previousPrimaryVisual?: string | null;
  store?: MissionArtifactStore;
}): ArtifactBuildResult {
  const store = input.store ?? createMissionArtifactStore({ missionId: input.missionId, turnId: input.turnId });
  const rawPreview = input.workflow?.primaryVisual
    ?? renderWebsitePreviewSvg({ brandName: input.brandName, industry: input.industry, contentMode: input.contentMode });
  const svg = sanitizeSvgArtifact(rawPreview);
  validateWebsiteSvg({ brandName: input.brandName, svg, previousPrimaryVisual: input.previousPrimaryVisual });
  const artifact = store.store({
    missionId: input.missionId,
    turnId: input.turnId,
    kind: "website_preview_svg",
    name: `${input.brandName.toLowerCase()}-website-preview.svg`,
    mimeType: "image/svg+xml",
    visibility: "simple_visible",
    content: svg,
    metadata: {
      brandName: input.brandName,
      industry: input.industry,
      style: input.style,
      contentMode: input.contentMode,
      assetRequests: input.assetRequests ?? [],
      wireframe: input.workflow?.wireframe,
      designDirection: input.workflow?.designDirection,
    },
  });
  return {
    artifact,
    visibleDeliverable: renderVisibleDeliverableFromArtifact({
      artifact,
      kind: "website_preview",
      mediaType: "svg",
      brandName: input.brandName,
      alt: `Preview site web ${input.brandName}`,
    }),
  };
}
