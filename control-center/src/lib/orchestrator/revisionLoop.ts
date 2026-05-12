import type { AgentOutput, MissionPlan, QualityReport, RevisionAttempt } from "./types";

export interface RevisionLoopResult {
  outputs: AgentOutput[];
  reports: QualityReport[];
  revisions: RevisionAttempt[];
  finalReport: QualityReport;
}

export function runRevisionLoop(input: {
  plan: MissionPlan;
  initialOutputs: AgentOutput[];
  initialReport: QualityReport;
  produceRevision: (attemptNumber: number, previousOutputs: AgentOutput[], previousReport: QualityReport) => AgentOutput[];
  score: (outputs: AgentOutput[]) => QualityReport;
  maxAttempts?: number;
}): RevisionLoopResult {
  const maxAttempts = input.maxAttempts ?? 3;
  let outputs = input.initialOutputs;
  let report = input.initialReport;
  const reports = [report];
  const revisions: RevisionAttempt[] = [];

  for (let attempt = 1; attempt <= maxAttempts && report.score < input.plan.minimumQualityScore; attempt += 1) {
    const beforeScore = report.score;
    const nextOutputs = input.produceRevision(attempt, outputs, report);
    const nextReport = input.score(nextOutputs);
    const revision: RevisionAttempt = {
      id: `${input.plan.id}-revision-${attempt}`,
      missionId: input.plan.id,
      attemptNumber: attempt,
      reason: report.rejectedReasons.join(" ") || "Score sous le seuil qualité.",
      beforeScore,
      afterScore: nextReport.score,
      changes: nextReport.score > beforeScore ? ["Différenciation renforcée", "Artifacts revalidés"] : ["Révision tentée sans amélioration suffisante"],
      outputIds: nextOutputs.map((output) => output.id),
      createdAt: new Date().toISOString(),
    };
    revisions.push(revision);
    outputs = nextOutputs;
    report = nextReport;
    reports.push(nextReport);
  }

  return { outputs, reports, revisions, finalReport: report };
}
