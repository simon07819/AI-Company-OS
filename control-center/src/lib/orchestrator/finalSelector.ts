import type { AgentOutput, FinalSelection, MissionPlan, QualityReport } from "./types";

export function selectFinalOutput(plan: MissionPlan, outputs: AgentOutput[], report: QualityReport): FinalSelection {
  const candidates = outputs
    .filter((output) => output.artifactPaths.length > 0)
    .sort((a, b) => (b.score ?? report.score) - (a.score ?? report.score));
  const selected = candidates[0] ?? outputs[0];
  const hasArtifacts = Boolean(selected?.artifactPaths.length);
  return {
    id: `${plan.id}-final-selection`,
    missionId: plan.id,
    selectedOutputId: selected?.id ?? "none",
    title: selected?.title ?? "Aucun résultat sélectionnable",
    reason: hasArtifacts
      ? "Meilleur équilibre entre pertinence au brief, score qualité et artifacts réels."
      : "Aucun artifact réel disponible: impossible de déclarer le résultat prêt.",
    qualityScore: report.score,
    artifactPaths: selected?.artifactPaths ?? [],
    readiness: hasArtifacts && report.passed ? "ready" : report.score >= plan.minimumQualityScore ? "needs_revision" : "rejected",
    createdAt: new Date().toISOString(),
  };
}
