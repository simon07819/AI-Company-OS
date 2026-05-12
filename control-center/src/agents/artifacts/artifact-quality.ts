import { createArtifactFingerprint } from "./artifact-fingerprint";
import { artifactIsLogoOnly } from "./artifact-renderer";
import type { MissionArtifact } from "./types";

export function validatePrimaryArtifactExists(input: { primaryArtifactId?: string; artifacts?: MissionArtifact[] }) {
  const artifact = input.artifacts?.find((item) => item.id === input.primaryArtifactId);
  return {
    gate: "validatePrimaryArtifactExists",
    ok: Boolean(artifact?.content),
    issues: artifact?.content ? [] : ["primaryArtifactId absent ou artifact primaire introuvable"],
  };
}

export function validateLogoArtifact(input: { artifact?: MissionArtifact | null; brandName?: string }) {
  const svg = input.artifact?.content ?? "";
  const issues = [
    ...(!input.artifact ? ["artifact logo manquant"] : []),
    ...(!/<svg[\s>]/i.test(svg) ? ["SVG manquant"] : []),
    ...(!/\bviewBox\s*=/i.test(svg) ? ["viewBox manquant"] : []),
    ...(/Brand system|Marque à nommer/i.test(svg) ? ["placeholder interdit"] : []),
    ...(!/(<path|<circle|<rect|<polygon|<line|<polyline)\b/i.test(svg) ? ["logo trop textuel"] : []),
    ...(input.brandName?.toUpperCase() === "EKIDA" && />\s*[AB]\s*</.test(svg) ? ["EKIDA utilise A/B générique"] : []),
  ];
  return { gate: "validateLogoArtifact", ok: issues.length === 0, issues };
}

export function validateWebsiteArtifact(input: { artifact?: MissionArtifact | null; brandName?: string }) {
  const svg = input.artifact?.content ?? "";
  const issues = [
    ...(!input.artifact ? ["artifact website manquant"] : []),
    ...(artifactIsLogoOnly(svg) ? ["preview website logo-only"] : []),
    ...(!/aria-label="nav"/i.test(svg) ? ["nav manquante"] : []),
    ...(!/aria-label="hero"/i.test(svg) ? ["hero manquant"] : []),
    ...(!/aria-label="sections"/i.test(svg) ? ["sections manquantes"] : []),
    ...(!/Voir la collection|CTA|Acheter|Contact/i.test(svg) ? ["CTA manquant"] : []),
    ...(!input.brandName || /Marque à nommer/i.test(input.brandName) ? ["brandName invalide"] : []),
  ];
  return { gate: "validateWebsiteArtifact", ok: issues.length === 0, issues };
}

export function validateArtifactIsolation(input: { artifacts: MissionArtifact[]; missionId: string; turnId: string }) {
  const issues = input.artifacts
    .filter((artifact) => artifact.missionId !== input.missionId || artifact.turnId !== input.turnId)
    .map((artifact) => `artifact isolé incorrectement: ${artifact.id}`);
  return { gate: "validateArtifactIsolation", ok: issues.length === 0, issues };
}

export function validateNoArtifactRecycle(input: { artifact?: MissionArtifact | null; previousPrimaryVisual?: string | null; previousDeliverableType?: string | null; currentDeliverableType?: string }) {
  const previousFingerprint = input.previousPrimaryVisual ? createArtifactFingerprint(input.previousPrimaryVisual) : null;
  const issues = previousFingerprint
    && input.artifact?.fingerprint === previousFingerprint
    && input.previousDeliverableType
    && input.currentDeliverableType
    && input.previousDeliverableType !== input.currentDeliverableType
    ? ["artifact primaire recyclé depuis un livrable incompatible"]
    : [];
  return { gate: "validateNoArtifactRecycle", ok: issues.length === 0, issues };
}

export function validateSimpleChatDoesNotExposeArtifacts(input: unknown) {
  const text = JSON.stringify(input);
  const issues = /artifacts|artifactPaths|quality report|executionTrace|toolTrace|workspace|README|runtime|process|score/i.test(text)
    ? ["visibleOutput expose des détails internes"]
    : [];
  return { gate: "validateSimpleChatDoesNotExposeArtifacts", ok: issues.length === 0, issues };
}
