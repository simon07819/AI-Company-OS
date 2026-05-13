import { getSkillCandidate, promoteSkillCandidate, rejectSkillCandidate } from "./skill-candidate-registry";
import { reviewSkillCandidateLicense } from "./skill-license-review";
import { reviewSkillCandidateRisk } from "./skill-risk-review";
import type { SkillBenchmarkResult, SkillCandidate, SkillPromotionDecision } from "./types";

export function decideSkillPromotion(candidate: SkillCandidate, benchmarkResults: SkillBenchmarkResult[]): SkillPromotionDecision {
  const risk = reviewSkillCandidateRisk(candidate);
  const license = reviewSkillCandidateLicense(candidate);
  if (risk.status === "blocked" || license.status === "blocked") {
    if (getSkillCandidate(candidate.id)) rejectSkillCandidate(candidate.id);
    return {
      candidateId: candidate.id,
      decision: "reject",
      reason: [...risk.issues, ...license.issues].join("; "),
      requiredFollowups: ["Resolve security/license blockers before any benchmark promotion."],
    };
  }
  if (!benchmarkResults.length || benchmarkResults.some((result) => result.candidateStatus === "fail" && !result.improvements.length)) {
    return {
      candidateId: candidate.id,
      decision: "needs_more_tests",
      reason: "Benchmark coverage is incomplete or candidate still fails target cases.",
      requiredFollowups: ["Add passing benchmark coverage for target deliverable types."],
    };
  }
  const hasImprovement = benchmarkResults.some((result) => result.improvements.length > 0);
  const hasCriticalRegression = benchmarkResults.some((result) => result.regressions.length > 0 || result.safetyIssues.length > 0);
  if (hasCriticalRegression) {
    rejectSkillCandidate(candidate.id);
    return {
      candidateId: candidate.id,
      decision: "reject",
      reason: "Candidate introduced regressions or safety issues.",
      requiredFollowups: benchmarkResults.flatMap((result) => [...result.regressions, ...result.safetyIssues]),
    };
  }
  if (!hasImprovement) {
    return {
      candidateId: candidate.id,
      decision: "needs_more_tests",
      reason: "Candidate is safe but did not beat baseline on a target benchmark.",
      requiredFollowups: ["Provide an eval failure or benchmark where the candidate improves the outcome."],
    };
  }
  promoteSkillCandidate(candidate.id);
  return {
    candidateId: candidate.id,
    decision: "promote",
    reason: "Candidate improved at least one benchmark with no critical regression or safety leak.",
    requiredFollowups: [],
  };
}
