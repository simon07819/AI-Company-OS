import path from "path";

const SENSITIVE_PATTERN = /(^|\/)\.env(\.|$|\/)|NVIDIA_API_KEY|secret|secrets/i;

export function safeArtifactName(name: string) {
  return name
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96) || "artifact";
}

export function assertSafeArtifactPath(relativePath: string) {
  if (SENSITIVE_PATTERN.test(relativePath)) throw new Error("Sensitive artifact path blocked");
  if (relativePath.includes("..")) throw new Error("Artifact path traversal blocked");
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (normalized.startsWith("../") || normalized === ".." || path.isAbsolute(relativePath)) {
    throw new Error("Artifact path escaped mission artifact root");
  }
  return normalized;
}

export function buildMissionArtifactPath(input: { missionId: string; turnId: string; name: string }) {
  assertSafeArtifactPath(input.name);
  const mission = safeArtifactName(input.missionId);
  const turn = safeArtifactName(input.turnId);
  const name = safeArtifactName(input.name);
  return assertSafeArtifactPath(`generated-products/_mission-artifacts/${mission}/${turn}/${name}`);
}
