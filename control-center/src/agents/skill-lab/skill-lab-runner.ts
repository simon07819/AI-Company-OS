import { skillBenchmarkCases } from "./benchmarks";
import { discoverSkillCandidates } from "./skill-discovery";
import { defaultSkillExperimentStore } from "./skill-experiment-store";
import { generateSkillLabReport } from "./skill-lab-report";
import { decideSkillPromotion } from "./skill-promotion-policy";
import { runSkillBenchmarks } from "./skill-benchmark-runner";
import type { SkillBenchmarkCase, SkillCandidate, SkillExperimentRecord, SkillLabRuntime } from "./types";

export function runAgentSkillLab(input?: {
  candidates?: SkillCandidate[];
  benchmarkCases?: SkillBenchmarkCase[];
  baselineRuntime?: SkillLabRuntime;
  candidateRuntime?: SkillLabRuntime;
  promote?: boolean;
}) {
  const candidates = input?.candidates ?? discoverSkillCandidates();
  const benchmarkCases = input?.benchmarkCases ?? skillBenchmarkCases;
  const records: SkillExperimentRecord[] = [];

  for (const candidate of candidates) {
    const relevantBenchmarks = benchmarkCases.filter((benchmark) => {
      const expected = benchmark.expectedDeliverableType;
      return candidate.deliverableTypes.includes("any") || candidate.deliverableTypes.includes(expected) || (expected === "website" && candidate.deliverableTypes.includes("landing_page"));
    });
    const benchmarkResults = runSkillBenchmarks({
      candidate,
      benchmarkCases: relevantBenchmarks,
      baselineRuntime: input?.baselineRuntime,
      candidateRuntime: input?.candidateRuntime,
    });
    const decision = input?.promote === false
      ? { candidateId: candidate.id, decision: "needs_more_tests" as const, reason: "Promotion disabled for this dry run.", requiredFollowups: [] }
      : decideSkillPromotion(candidate, benchmarkResults);
    const record: SkillExperimentRecord = {
      id: `skill-lab-${candidate.id}-${Date.now().toString(36)}`,
      candidateId: candidate.id,
      benchmarkResults,
      promotionDecision: decision,
      status: decision.decision === "promote" ? "promoted" : decision.decision === "reject" ? "rejected" : "benchmarking",
      createdAt: new Date().toISOString(),
      hiddenReport: generateSkillLabReport({ candidateId: candidate.id, benchmarkResults, promotionDecision: decision }),
    };
    records.push(defaultSkillExperimentStore.add(record));
  }

  return {
    records,
    hiddenReport: records.map((record) => record.hiddenReport),
  };
}

