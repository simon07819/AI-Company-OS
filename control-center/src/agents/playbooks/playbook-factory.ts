import type { AgentPlaybook, FailureMode, PlaybookExample, PlaybookStep } from "./types";

export function step(id: string, name: string, instruction: string, expectedOutput: string, qualityCheck: string[]): PlaybookStep {
  return { id, name, instruction, expectedOutput, qualityCheck };
}

export function fail(id: string, description: string, detectionHints: string[], correctionStrategy: string, severity: "warning" | "fail" = "fail"): FailureMode {
  return { id, description, detectionHints, severity, correctionStrategy };
}

export function example(id: string, input: string, goodOutputDescription: string, badOutputDescription: string, reason: string): PlaybookExample {
  return { id, input, goodOutputDescription, badOutputDescription, reason };
}

export function playbook(input: AgentPlaybook): AgentPlaybook {
  return input;
}
