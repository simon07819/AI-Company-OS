import type { SkillBenchmarkResult, SkillExperimentRecord, SkillPromotionDecision } from "./types";

export function generateSkillLabReport(input: {
  candidateId: string;
  benchmarkResults: SkillBenchmarkResult[];
  promotionDecision: SkillPromotionDecision;
}) {
  return {
    candidateId: input.candidateId,
    benchmarksRun: input.benchmarkResults.length,
    passCount: input.benchmarkResults.filter((result) => result.candidateStatus === "pass").length,
    improvements: input.benchmarkResults.flatMap((result) => result.improvements),
    regressions: input.benchmarkResults.flatMap((result) => result.regressions),
    safetyIssues: input.benchmarkResults.flatMap((result) => result.safetyIssues),
    promotionDecision: input.promotionDecision,
  };
}

export function summarizeSkillExperiments(records: SkillExperimentRecord[]) {
  return records.map((record) => ({
    candidateId: record.candidateId,
    status: record.status,
    decision: record.promotionDecision.decision,
    benchmarks: record.benchmarkResults.length,
  }));
}

