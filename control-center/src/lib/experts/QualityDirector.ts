import type { AgentOutput, MissionPlan, QualityReport } from "@/lib/orchestrator/types";

export function runQualityDirector(plan: MissionPlan, report?: QualityReport): AgentOutput {
  return {
    id: `${plan.id}-quality-direction`,
    missionId: plan.id,
    expert: "QualityDirector",
    title: "Quality review",
    kind: "quality",
    summary: report
      ? `Score ${report.score}/100: ${report.passed ? "validé" : "révision requise"}`
      : "Le résultat sera rejeté si les artifacts réels, le brief ou la différenciation ne sont pas suffisants.",
    content: report ? JSON.stringify(report, null, 2) : plan.successCriteria.join("\n"),
    artifactPaths: [],
    score: report?.score,
  };
}
