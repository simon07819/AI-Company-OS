import { describe, expect, it } from "vitest";
import { generateEvalReport } from "./eval-report";
import { runCeoAgentEvals } from "./eval-runner";
import { ceoAgentEvalCases } from "./eval-cases";

describe("CEO agent product evals", () => {
  it("passes golden regression cases for logo, website, memory and visibility", () => {
    const results = runCeoAgentEvals(ceoAgentEvalCases);
    const report = generateEvalReport(results);

    expect(report.failures).toEqual([]);
    expect(report.passed).toBe(ceoAgentEvalCases.length);
  });
});
