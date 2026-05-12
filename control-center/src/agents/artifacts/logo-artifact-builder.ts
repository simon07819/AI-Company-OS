import type { DesignConcept } from "@/lib/design-team/logoWorkflow";
import { renderVisibleDeliverableFromArtifact } from "./artifact-renderer";
import { createMissionArtifactStore, type MissionArtifactStore } from "./artifact-store";
import { sanitizeSvgArtifact } from "./artifact-sanitizer";
import type { ArtifactBuildResult } from "./types";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function validateLogoSvg(input: { brandName: string; svg: string; background?: string }) {
  const brand = normalize(input.brandName);
  if (!input.brandName || /Marque à nommer/i.test(input.brandName)) throw new Error("Logo artifact missing real brandName");
  if (/Brand system|Marque à nommer/i.test(input.svg)) throw new Error("Generic brand placeholder blocked");
  if (!/(<path|<circle|<rect|<polygon|<line|<polyline)\b/i.test(input.svg)) throw new Error("Logo artifact is text-only");
  if (brand === "EKIDA" && />\s*[AB]\s*</.test(input.svg)) throw new Error("EKIDA logo used unrelated generic initial");
  if (brand === "EKIDA" && !/EKIDA|>EK<|>E</i.test(input.svg)) throw new Error("EKIDA logo does not contain EKIDA, EK or E");
  if (brand === "PROSHOTS" && !/PROSHOTS|>PS<|>P<|camera|viewfinder|viseur/i.test(input.svg)) {
    throw new Error("PROSHOTS logo missing photo/sport signal");
  }
  if (input.background === "black" && !/#030712|#000000|#111827|black/i.test(input.svg)) {
    throw new Error("Black background requested but not reflected in logo SVG");
  }
}

export function buildLogoArtifact(input: {
  missionId: string;
  turnId: string;
  brandName: string;
  style?: string;
  background?: string;
  selectedConcept?: DesignConcept;
  primaryVisual?: string;
  constraints?: string[];
  store?: MissionArtifactStore;
}): ArtifactBuildResult {
  const store = input.store ?? createMissionArtifactStore({ missionId: input.missionId, turnId: input.turnId });
  const svg = sanitizeSvgArtifact(input.selectedConcept?.svg ?? input.primaryVisual ?? "");
  validateLogoSvg({ brandName: input.brandName, svg, background: input.background });
  const artifact = store.store({
    missionId: input.missionId,
    turnId: input.turnId,
    kind: "logo_svg",
    name: `${input.brandName.toLowerCase()}-logo.svg`,
    mimeType: "image/svg+xml",
    visibility: "simple_visible",
    content: svg,
    metadata: {
      brandName: input.brandName,
      style: input.style,
      background: input.background,
      selectedConceptId: input.selectedConcept?.id,
      constraints: input.constraints ?? [],
    },
  });
  return {
    artifact,
    visibleDeliverable: renderVisibleDeliverableFromArtifact({
      artifact,
      kind: "logo",
      mediaType: "svg",
      brandName: input.brandName,
      alt: `Logo ${input.brandName}`,
    }),
  };
}
