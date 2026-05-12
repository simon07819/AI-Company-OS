import type { MissionArtifact } from "./types";

export function renderVisibleDeliverableFromArtifact(input: {
  artifact: MissionArtifact;
  kind: "logo" | "website_preview";
  mediaType: "svg" | "html" | "image";
  brandName?: string;
  alt: string;
}) {
  if (!input.artifact.content) throw new Error("Primary artifact has no renderable content");
  return {
    artifactId: input.artifact.id,
    kind: input.kind,
    mediaType: input.mediaType,
    brandName: input.brandName,
    content: input.artifact.content,
    alt: input.alt,
  };
}

export function artifactIsLogoOnly(content: string) {
  return /aria-label="Logo/i.test(content) && !/aria-label="nav"|aria-label="hero"|aria-label="sections"|Voir la collection/i.test(content);
}
