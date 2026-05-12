import type { MissionArtifact } from "./types";

export function buildHiddenArtifacts(artifacts: MissionArtifact[]) {
  return artifacts.map((artifact) => ({
    id: artifact.id,
    missionId: artifact.missionId,
    turnId: artifact.turnId,
    kind: artifact.kind,
    name: artifact.name,
    mimeType: artifact.mimeType,
    visibility: artifact.visibility,
    path: artifact.path,
    fingerprint: artifact.fingerprint,
    createdAt: artifact.createdAt,
    metadata: artifact.metadata,
  }));
}

export function filterSimpleVisibleArtifacts(artifacts: MissionArtifact[]) {
  return artifacts.filter((artifact) => artifact.visibility === "simple_visible");
}
