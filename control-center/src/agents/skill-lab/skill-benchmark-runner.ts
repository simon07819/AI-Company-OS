import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import type { MissionRuntimeResult } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { compareBenchmarkFailures, evaluateBenchmarkOutput } from "./skill-comparison";
import type { SkillBenchmarkCase, SkillBenchmarkResult, SkillCandidate, SkillLabRuntime } from "./types";

type VisibleOutput = { deliverableType?: string; brandName?: string; primaryVisual?: string };

function previousFromResult(result: MissionRuntimeResult): PreviousDeliverable {
  const output = result.visibleOutput as VisibleOutput;
  return {
    deliverableType: output.deliverableType,
    brandName: output.brandName,
    primaryVisual: output.primaryVisual,
    primaryArtifactFingerprint: output.primaryVisual ? createArtifactFingerprint(output.primaryVisual) : undefined,
  };
}

function runCase(runtime: SkillLabRuntime, benchmark: SkillBenchmarkCase, experimentalCandidateIds?: string[]) {
  const previousResults: MissionRuntimeResult[] = [];
  let previousDeliverable: PreviousDeliverable | null = null;
  for (const previousTurn of benchmark.previousTurns ?? []) {
    const previous = runtime(previousTurn.prompt, { previousDeliverable, experimentalCandidateIds });
    previousResults.push(previous);
    previousDeliverable = previousFromResult(previous);
  }
  const result = runtime(benchmark.prompt, { previousDeliverable, experimentalCandidateIds });
  return { result, previousResult: previousResults.at(-1) };
}

export function runSkillBenchmarks(input: {
  candidate: SkillCandidate;
  benchmarkCases: SkillBenchmarkCase[];
  baselineRuntime?: SkillLabRuntime;
  candidateRuntime?: SkillLabRuntime;
}): SkillBenchmarkResult[] {
  const baselineRuntime = input.baselineRuntime ?? ((prompt, context) => runAgentMission(prompt, { previousDeliverable: context?.previousDeliverable as PreviousDeliverable | null, mode: "simple" }));
  const candidateRuntime = input.candidateRuntime ?? ((prompt, context) => runAgentMission(prompt, { previousDeliverable: context?.previousDeliverable as PreviousDeliverable | null, mode: "simple" }));

  return input.benchmarkCases.map((benchmark) => {
    const baseline = runCase(baselineRuntime, benchmark);
    const candidate = runCase(candidateRuntime, benchmark, [input.candidate.id]);
    const baselineFailures = evaluateBenchmarkOutput(baseline.result, benchmark, baseline.previousResult);
    const candidateFailures = evaluateBenchmarkOutput(candidate.result, benchmark, candidate.previousResult);
    const comparison = compareBenchmarkFailures(baselineFailures, candidateFailures);
    return {
      candidateId: input.candidate.id,
      benchmarkId: benchmark.id,
      baselineStatus: baselineFailures.length ? "fail" : "pass",
      candidateStatus: candidateFailures.length ? "fail" : "pass",
      improvements: comparison.improvements,
      regressions: comparison.regressions,
      safetyIssues: comparison.safetyIssues,
      approvedForPromotion: candidateFailures.length === 0 && comparison.regressions.length === 0 && comparison.safetyIssues.length === 0,
    };
  });
}

