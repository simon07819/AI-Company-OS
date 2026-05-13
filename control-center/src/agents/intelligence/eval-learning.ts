import type { EvalResult } from "@/agents/evals/types";
import type { AgentLesson } from "./types";

export function learnFromEvalFailures(results: EvalResult[]): AgentLesson[] {
  return results.flatMap((result) => result.failures.map((failure, index) => lessonFromFailure(result.id, failure, index)));
}

function lessonFromFailure(evalId: string, failure: string, index: number): AgentLesson {
  if (/Brand system/i.test(failure)) {
    return {
      id: `${evalId}-lesson-${index}`,
      sourceEvalId: evalId,
      agentRole: "ceo",
      failurePattern: "Brand system visible for requested deliverable",
      correctionRule: "Route logo prompts to logo_design and never expose brandSystem in simple chat.",
      appliesToDeliverableType: "logo",
    };
  }
  if (/recycl|previous|primaryVisual/i.test(failure)) {
    return {
      id: `${evalId}-lesson-${index}`,
      sourceEvalId: evalId,
      agentRole: "quality_director",
      failurePattern: "Previous primary output reused",
      correctionRule: "Forbid incompatible previous fingerprints as primary artifacts.",
      appliesToDeliverableType: "website",
    };
  }
  return {
    id: `${evalId}-lesson-${index}`,
    sourceEvalId: evalId,
    agentRole: "quality_director",
    failurePattern: failure,
    correctionRule: "Convert this failure into a quality issue before final approval.",
    appliesToDeliverableType: "any",
  };
}
