import crypto from "crypto";
import type { MissionArtifact } from "./types";

export function createArtifactFingerprint(content: string) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function assertNotReusedAsPrimaryArtifact(
  currentArtifact: Pick<MissionArtifact, "fingerprint" | "kind">,
  previousDeliverable?: { deliverableType?: string | null; primaryVisual?: string | null; primaryArtifactFingerprint?: string | null } | null,
) {
  if (!previousDeliverable) return;
  const previousFingerprint = previousDeliverable.primaryArtifactFingerprint
    ?? (previousDeliverable.primaryVisual ? createArtifactFingerprint(previousDeliverable.primaryVisual) : null);
  if (!previousFingerprint) return;

  const previousType = previousDeliverable.deliverableType;
  const currentType = currentArtifact.kind.startsWith("website") ? "website" : currentArtifact.kind.startsWith("logo") ? "logo" : currentArtifact.kind;
  if (previousType && previousType !== currentType && previousFingerprint === currentArtifact.fingerprint) {
    throw new Error("Primary artifact reused across incompatible deliverable types");
  }
}
