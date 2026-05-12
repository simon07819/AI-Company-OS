import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";

export function createMemoryFingerprint(content: string) {
  return createArtifactFingerprint(content);
}
