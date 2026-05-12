import { buildMissionArtifactPath, assertSafeArtifactPath } from "./artifact-paths";
import { createArtifactFingerprint } from "./artifact-fingerprint";
import { assertNoArtifactSecrets } from "./artifact-sanitizer";
import type { ArtifactStoreInput, ArtifactVisibility, MissionArtifact } from "./types";

export type MissionArtifactStore = {
  store: (input: ArtifactStoreInput) => MissionArtifact;
  list: (visibility?: ArtifactVisibility) => MissionArtifact[];
  primary: () => MissionArtifact | null;
};

export function createMissionArtifactStore(context: { missionId: string; turnId: string }) {
  const artifacts: MissionArtifact[] = [];

  const store = (input: ArtifactStoreInput) => {
    if (input.missionId !== context.missionId || input.turnId !== context.turnId) {
      throw new Error("Artifact mission isolation violation");
    }
    assertNoArtifactSecrets(input.content);
    const path = buildMissionArtifactPath({ missionId: input.missionId, turnId: input.turnId, name: input.name });
    assertSafeArtifactPath(path);
    const fingerprint = createArtifactFingerprint(input.content);
    const artifact: MissionArtifact = {
      id: `${input.kind}-${fingerprint.slice(0, 12)}`,
      missionId: input.missionId,
      turnId: input.turnId,
      kind: input.kind,
      name: input.name,
      mimeType: input.mimeType,
      visibility: input.visibility,
      content: input.content,
      path,
      fingerprint,
      createdAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    };
    artifacts.push(artifact);
    return artifact;
  };

  return {
    store,
    list: (visibility?: ArtifactVisibility) => artifacts.filter((artifact) => !visibility || artifact.visibility === visibility),
    primary: () => artifacts.find((artifact) => artifact.visibility === "simple_visible") ?? null,
  } satisfies MissionArtifactStore;
}
